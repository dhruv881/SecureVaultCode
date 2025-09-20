import OpenAI from "openai";
import fs from "fs";
import path from "path";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScanResult {
  expiryDate: string | null;
  documentType: string | null;
  confidence: number;
  documentNumber?: string | null;
}

export async function scanDocumentForExpiry(filePath: string, mimeType: string, enableRemoteScanning = false): Promise<ScanResult> {
  try {
    console.log(`=== OCR SCAN START ===`);
    console.log(`File path: ${filePath}`);
    console.log(`MIME type: ${mimeType}`);
    console.log(`Enable remote scanning: ${enableRemoteScanning}`);
    console.log(`OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
    
    // PRIVACY: Remote OCR disabled by default - user data is not sent to third parties
    if (!enableRemoteScanning) {
      console.log('❌ Remote OCR scanning disabled for privacy. Set ENABLE_REMOTE_OCR=true to enable.');
      return { expiryDate: null, documentType: null, confidence: 0, documentNumber: null };
    }

    // Only scan images and PDFs that might contain identity documents
    if (!mimeType.includes('image') && !mimeType.includes('pdf')) {
      console.log('❌ File type not supported for OCR');
      return { expiryDate: null, documentType: null, confidence: 0, documentNumber: null };
    }

    // For images, convert to base64
    if (mimeType.includes('image')) {
      console.log('📸 Processing image file...');
      const imageBuffer = fs.readFileSync(filePath);
      console.log(`Image buffer size: ${imageBuffer.length} bytes`);
      const base64Image = imageBuffer.toString('base64');
      console.log(`Base64 image length: ${base64Image.length} characters`);

      console.log('🚀 Calling OpenAI API...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a specialized document scanner for UK identity documents (BRP, Passport, Driving License). 
            Extract expiry dates with high accuracy. Return JSON with:
            - expiryDate: in ISO format YYYY-MM-DD if found, null if not found
            - documentType: "passport", "brp", "driving_license", "id_card", or "other"
            - confidence: 0-1 score of how confident you are
            - documentNumber: document number if visible (for BRP/Passport)
            
            SPECIFIC PATTERNS TO LOOK FOR:
            - BRP: "Date of expiry" or "Valid until" (usually DD MMM YYYY format like "15 JAN 2025")
            - Passport: "Date of expiry" (usually DD MMM YYYY format)
            - Driving License: "4b" field with expiry date
            
            Common date formats: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, MM/DD/YYYY
            Pay special attention to UK date formats (DD/MM/YYYY is most common).
            
            Be extra careful with BRP documents - they often have multiple dates, ensure you get the EXPIRY date, not issue date.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please carefully scan this identity document (BRP, Passport, Driving License, etc.) and extract the expiry date. Look for phrases like 'Date of expiry', 'Valid until', 'Expires', or similar. Pay special attention to UK document formats. Return the result in JSON format with the exact structure requested."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000,
      });

      console.log('🤖 OpenAI response received');
      console.log('Raw response:', response.choices[0].message.content);
      const result = JSON.parse(response.choices[0].message.content!);
      
      // Validate and format the expiry date
      if (result.expiryDate) {
        const parsedDate = new Date(result.expiryDate);
        if (!isNaN(parsedDate.getTime())) {
          result.expiryDate = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          result.expiryDate = null;
        }
      }

      return {
        expiryDate: result.expiryDate,
        documentType: result.documentType,
        confidence: Math.max(0, Math.min(1, result.confidence || 0)),
        documentNumber: result.documentNumber || null
      };
    }

    // For PDFs, we need to convert to images first for OCR
    // For now, return a message encouraging image upload
    if (mimeType.includes('pdf')) {
      console.log('PDF document detected. For best OCR results, please convert to image format (JPG/PNG).');
      return { 
        expiryDate: null, 
        documentType: null, 
        confidence: 0, 
        documentNumber: null 
      };
    }

    return { expiryDate: null, documentType: null, confidence: 0, documentNumber: null };

  } catch (error) {
    console.error('Error scanning document:', error);
    return { expiryDate: null, documentType: null, confidence: 0, documentNumber: null };
  }
}

export function shouldScanDocument(filename: string, category: string): boolean {
  const name = filename.toLowerCase();
  
  console.log(`Checking if should scan: ${filename} (category: ${category})`);
  
  // Scan identity documents and important legal documents
  if (category !== 'Identity Documents' && category !== 'Legal Documents') {
    console.log(`Skipping scan - category ${category} not eligible`);
    return false;
  }
  
  // Priority documents for expiry scanning
  const priorityKeywords = [
    'passport', 'brp', 'biometric', 'residence', 'permit',
    'license', 'licence', 'driving', 'id', 'identity',
    'visa', 'work', 'student', 'tier'
  ];
  
  const shouldScan = priorityKeywords.some(keyword => name.includes(keyword));
  console.log(`Should scan ${filename}: ${shouldScan}`);
  
  // Also scan if it's any PDF or image in Identity Documents category
  if (category === 'Identity Documents' && !shouldScan) {
    console.log(`Scanning anyway - Identity Document category`);
    return true;
  }
  
  return shouldScan;
}