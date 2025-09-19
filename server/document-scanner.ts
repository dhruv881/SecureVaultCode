import OpenAI from "openai";
import fs from "fs";
import path from "path";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScanResult {
  expiryDate: string | null;
  documentType: string | null;
  confidence: number;
}

export async function scanDocumentForExpiry(filePath: string, mimeType: string, enableRemoteScanning = false): Promise<ScanResult> {
  try {
    // PRIVACY: Remote OCR disabled by default - user data is not sent to third parties
    if (!enableRemoteScanning) {
      console.log('Remote OCR scanning disabled for privacy. Set ENABLE_REMOTE_OCR=true to enable.');
      return { expiryDate: null, documentType: null, confidence: 0 };
    }

    // Only scan images and PDFs that might contain identity documents
    if (!mimeType.includes('image') && !mimeType.includes('pdf')) {
      return { expiryDate: null, documentType: null, confidence: 0 };
    }

    // For images, convert to base64
    if (mimeType.includes('image')) {
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a document scanner that extracts expiry dates from identity documents. 
            Analyze the image and return JSON with:
            - expiryDate: in ISO format YYYY-MM-DD if found, null if not found
            - documentType: "passport", "brp", "license", "id_card", or "other" 
            - confidence: 0-1 score of how confident you are
            
            Look for text like "Date of Expiry", "Expires", "Valid Until", "Expiry Date", etc.
            Be very careful about date formats - they could be DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please scan this document and extract the expiry date if it's an identity document (passport, BRP, license, etc.). Return the result in JSON format."
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
        confidence: Math.max(0, Math.min(1, result.confidence || 0))
      };
    }

    // For PDFs, we can't process them directly with vision API
    // Return null for now - would need PDF to image conversion
    return { expiryDate: null, documentType: null, confidence: 0 };

  } catch (error) {
    console.error('Error scanning document:', error);
    return { expiryDate: null, documentType: null, confidence: 0 };
  }
}

export function shouldScanDocument(filename: string, category: string): boolean {
  const name = filename.toLowerCase();
  
  // Only scan identity documents
  if (category !== 'Identity Documents') return false;
  
  // Look for passport, BRP, license keywords
  return name.includes('passport') || 
         name.includes('brp') || 
         name.includes('biometric') || 
         name.includes('license') || 
         name.includes('licence') ||
         name.includes('id');
}