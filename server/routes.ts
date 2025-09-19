import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema, insertReminderSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

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

// Mock user ID for demo - in real app this would come from authentication
const DEMO_USER_ID = "demo-user-123";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDocumentStats(DEMO_USER_ID);
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

      if (search) {
        documents = await storage.searchDocuments(DEMO_USER_ID, search as string);
      } else if (category) {
        documents = await storage.getDocumentsByCategory(DEMO_USER_ID, category as string);
      } else {
        documents = await storage.getDocuments(DEMO_USER_ID);
      }

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id, DEMO_USER_ID);
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
        userId: DEMO_USER_ID,
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

      const document = await storage.createDocument(result.data);

      // Create automatic reminders for documents with expiry dates
      if (document.expiryDate) {
        await createExpiryReminders(document);
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
      const success = await storage.deleteDocument(req.params.id, DEMO_USER_ID);
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
        reminders = await storage.getUpcomingReminders(DEMO_USER_ID, days);
      } else {
        reminders = await storage.getActiveReminders(DEMO_USER_ID);
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
        userId: DEMO_USER_ID,
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
      const categories = await storage.getCategoriesWithCounts(DEMO_USER_ID);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function categorizeDocument(filename: string, mimeType: string): string {
  const name = filename.toLowerCase();
  
  if (name.includes('passport') || name.includes('license') || name.includes('id')) {
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

async function createExpiryReminders(document: any): Promise<void> {
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
        userId: DEMO_USER_ID,
        documentId: document.id,
        reminderDate,
        message: reminder.message,
        isActive: true,
      });
    }
  }
}
