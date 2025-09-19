import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Authenticated user interface
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

// Helper to get user ID from authenticated request
const getUserId = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  return authReq.user?.id || 'anonymous';
};
import { insertDocumentSchema, insertReminderSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { scanDocumentForExpiry, shouldScanDocument } from "./document-scanner";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Users are now authenticated via Google OAuth

export async function registerRoutes(app: Express): Promise<Server> {
  // Get dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const userId = getUserId(req);
      const stats = await storage.getDocumentStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const { category, search } = req.query;
      let documents;

      const userId = getUserId(req);
      if (search) {
        documents = await storage.searchDocuments(userId, search as string);
      } else if (category) {
        documents = await storage.getDocumentsByCategory(userId, category as string);
      } else {
        documents = await storage.getDocuments(userId);
      }

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id, getUserId(req));
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to get document" });
    }
  });

  // Upload document
  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { category, expiryDate, tags } = req.body;
      
      // Auto-categorize if not provided
      const detectedCategory = category || categorizeDocument(req.file.originalname, req.file.mimetype);

      const documentData = {
        userId: getUserId(req),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        category: detectedCategory,
        tags: tags ? JSON.parse(tags) : [],
        metadata: extractMetadata(req.file),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isEncrypted: true,
      };

      const result = insertDocumentSchema.safeParse(documentData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid document data", details: result.error });
      }

      let document = await storage.createDocument(result.data);

      // Try to automatically scan for expiry date if not provided and it's an identity document
      if (!document.expiryDate && shouldScanDocument(document.originalName, document.category)) {
        try {
          console.log(`Scanning document ${document.originalName} for expiry date...`);
          const filePath = path.join(process.cwd(), 'uploads', document.filename);
          const enableRemoteScanning = process.env.ENABLE_REMOTE_OCR === 'true';
          const scanResult = await scanDocumentForExpiry(filePath, document.mimeType, enableRemoteScanning);
          
          if (scanResult.expiryDate && scanResult.confidence > 0.7) {
            console.log(`Found expiry date: ${scanResult.expiryDate} (confidence: ${scanResult.confidence})`);
            // Update the document with the scanned expiry date
            const updatedDocument = await storage.updateDocument(document.id, getUserId(req), {
              expiryDate: new Date(scanResult.expiryDate)
            });
            if (updatedDocument) {
              document = updatedDocument;
            }
          }
        } catch (error) {
          console.warn('Document scanning failed:', error);
          // Continue without expiry date - don't fail the upload
        }
      }

      // Create automatic reminders for documents with expiry dates
      if (document.expiryDate) {
        await createExpiryReminders(document, getUserId(req));
      }

      res.json(document);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const success = await storage.deleteDocument(req.params.id, getUserId(req));
      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Get reminders
  app.get("/api/reminders", async (req, res) => {
    try {
      const { upcoming } = req.query;
      let reminders;

      if (upcoming) {
        const days = parseInt(upcoming as string) || 30;
        reminders = await storage.getUpcomingReminders(getUserId(req), days);
      } else {
        reminders = await storage.getActiveReminders(getUserId(req));
      }

      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: "Failed to get reminders" });
    }
  });

  // Create reminder
  app.post("/api/reminders", async (req, res) => {
    try {
      const reminderData = {
        ...req.body,
        userId: getUserId(req),
        reminderDate: new Date(req.body.reminderDate),
      };

      const result = insertReminderSchema.safeParse(reminderData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid reminder data", details: result.error });
      }

      const reminder = await storage.createReminder(result.data);
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  // Get categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategoriesWithCounts(getUserId(req));
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:filename", async (req, res) => {
    try {
      // Sanitize filename to prevent path traversal attacks
      const filename = path.basename(req.params.filename);
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Ensure the resolved path is within the uploads directory
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Find the document to get proper mime type and verify access
      const document = await storage.getDocuments(getUserId(req)).then(docs => 
        docs.find(doc => doc.filename === filename)
      );
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Check if file exists and send it with proper content type
      await fs.access(resolvedPath);
      res.type(document.mimeType);
      res.sendFile(resolvedPath);
    } catch (error) {
      res.status(404).json({ error: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function categorizeDocument(filename: string, mimeType: string): string {
  const name = filename.toLowerCase();
  
  if (name.includes('passport') || name.includes('license') || name.includes('id') || name.includes('brp') || name.includes('biometric') || name.includes('residence permit')) {
    return 'Identity Documents';
  } else if (name.includes('bill') || name.includes('utility') || name.includes('invoice')) {
    return 'Bills & Utilities';
  } else if (name.includes('medical') || name.includes('health') || name.includes('doctor')) {
    return 'Medical Records';
  } else if (name.includes('receipt') || name.includes('purchase')) {
    return 'Receipts';
  } else if (name.includes('ticket') || name.includes('visa') || name.includes('travel')) {
    return 'Travel Documents';
  } else if (name.includes('insurance') || name.includes('policy')) {
    return 'Insurance';
  }
  
  return 'Receipts'; // Default category
}

function extractMetadata(file: Express.Multer.File): Record<string, any> {
  return {
    uploadDate: new Date().toISOString(),
    fileExtension: path.extname(file.originalname),
    encoding: file.encoding,
  };
}

async function createExpiryReminders(document: any, userId: string): Promise<void> {
  if (!document.expiryDate) return;

  const expiryDate = new Date(document.expiryDate);
  const reminders = [
    { days: 90, message: `${document.originalName} expires in 3 months` },
    { days: 30, message: `${document.originalName} expires in 1 month` },
    { days: 7, message: `${document.originalName} expires in 1 week` },
  ];

  for (const reminder of reminders) {
    const reminderDate = new Date(expiryDate);
    reminderDate.setDate(reminderDate.getDate() - reminder.days);

    if (reminderDate > new Date()) {
      await storage.createReminder({
        userId: userId,
        documentId: document.id,
        reminderDate,
        message: reminder.message,
        isActive: true,
      });
    }
  }
}
