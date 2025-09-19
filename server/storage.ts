import { type User, type InsertUser, type Document, type InsertDocument, type Reminder, type InsertReminder, type Category, type InsertCategory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Documents
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string, userId: string): Promise<Document | undefined>;
  getDocumentsByCategory(userId: string, category: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, userId: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string, userId: string): Promise<boolean>;
  searchDocuments(userId: string, query: string): Promise<Document[]>;

  // Reminders
  getReminders(userId: string): Promise<Reminder[]>;
  getActiveReminders(userId: string): Promise<Reminder[]>;
  getUpcomingReminders(userId: string, days: number): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, userId: string, updates: Partial<Reminder>): Promise<Reminder | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Statistics
  getDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    expiringSoon: number;
    storageUsed: number;
    byCategory: Record<string, number>;
    storageByType: {
      pdfs: number;
      images: number;
      documents: number;
    };
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private documents: Map<string, Document>;
  private reminders: Map<string, Reminder>;
  private categories: Map<string, Category>;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.reminders = new Map();
    this.categories = new Map();
    this.initializeCategories();
  }

  private initializeCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "Identity Documents", icon: "fas fa-id-card", color: "#3b82f6", description: "Passports, licenses, ID cards" },
      { name: "Bills & Utilities", icon: "fas fa-file-invoice", color: "#ef4444", description: "Utility bills, invoices" },
      { name: "Medical Records", icon: "fas fa-heartbeat", color: "#10b981", description: "Health records, prescriptions" },
      { name: "Receipts", icon: "fas fa-receipt", color: "#f59e0b", description: "Purchase receipts, warranties" },
      { name: "Travel Documents", icon: "fas fa-plane", color: "#8b5cf6", description: "Tickets, visas, itineraries" },
      { name: "Insurance", icon: "fas fa-shield-alt", color: "#06b6d4", description: "Insurance policies, claims" },
    ];

    defaultCategories.forEach(category => {
      const id = randomUUID();
      this.categories.set(id, { ...category, id, description: category.description || null });
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Documents
  async getDocuments(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.userId === userId);
  }

  async getDocument(id: string, userId: string): Promise<Document | undefined> {
    const doc = this.documents.get(id);
    return doc?.userId === userId ? doc : undefined;
  }

  async getDocumentsByCategory(userId: string, category: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      doc => doc.userId === userId && doc.category === category
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt: new Date(),
      metadata: insertDocument.metadata || null,
      tags: insertDocument.tags ?? null,
      expiryDate: insertDocument.expiryDate ?? null,
      isEncrypted: insertDocument.isEncrypted ?? null,
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, userId: string, updates: Partial<Document>): Promise<Document | undefined> {
    const doc = this.documents.get(id);
    if (!doc || doc.userId !== userId) return undefined;

    const updatedDoc = { ...doc, ...updates };
    this.documents.set(id, updatedDoc);
    return updatedDoc;
  }

  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const doc = this.documents.get(id);
    if (!doc || doc.userId !== userId) return false;

    this.documents.delete(id);
    // Also delete related reminders
    const reminders = Array.from(this.reminders.entries()).filter(
      ([, reminder]) => reminder.documentId === id
    );
    reminders.forEach(([reminderId]) => this.reminders.delete(reminderId));
    return true;
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.documents.values()).filter(doc => 
      doc.userId === userId && (
        doc.filename.toLowerCase().includes(lowerQuery) ||
        doc.originalName.toLowerCase().includes(lowerQuery) ||
        doc.category.toLowerCase().includes(lowerQuery) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
    );
  }

  // Reminders
  async getReminders(userId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).filter(reminder => reminder.userId === userId);
  }

  async getActiveReminders(userId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).filter(
      reminder => reminder.userId === userId && reminder.isActive
    );
  }

  async getUpcomingReminders(userId: string, days: number): Promise<Reminder[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return Array.from(this.reminders.values()).filter(reminder => 
      reminder.userId === userId && 
      reminder.isActive &&
      reminder.reminderDate <= futureDate &&
      reminder.reminderDate >= new Date()
    );
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    const reminder: Reminder = {
      ...insertReminder,
      id,
      createdAt: new Date(),
      isActive: insertReminder.isActive ?? true,
    };
    this.reminders.set(id, reminder);
    return reminder;
  }

  async updateReminder(id: string, userId: string, updates: Partial<Reminder>): Promise<Reminder | undefined> {
    const reminder = this.reminders.get(id);
    if (!reminder || reminder.userId !== userId) return undefined;

    const updatedReminder = { ...reminder, ...updates };
    this.reminders.set(id, updatedReminder);
    return updatedReminder;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoriesWithCounts(userId: string): Promise<(Category & { documentCount: number })[]> {
    const categories = Array.from(this.categories.values());
    const userDocuments = await this.getDocuments(userId);
    
    return categories.map(category => {
      const documentCount = userDocuments.filter(doc => doc.category === category.name).length;
      return { ...category, documentCount };
    });
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { ...insertCategory, id, description: insertCategory.description || null };
    this.categories.set(id, category);
    return category;
  }

  // Statistics
  async getDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    expiringSoon: number;
    storageUsed: number;
    byCategory: Record<string, number>;
    storageByType: {
      pdfs: number;
      images: number;
      documents: number;
    };
  }> {
    const userDocs = Array.from(this.documents.values()).filter(doc => doc.userId === userId);
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    const expiringSoon = userDocs.filter(doc => 
      doc.expiryDate && doc.expiryDate <= threeMonthsFromNow && doc.expiryDate >= now
    ).length;

    const storageUsed = userDocs.reduce((total, doc) => total + doc.size, 0);

    const byCategory: Record<string, number> = {};
    userDocs.forEach(doc => {
      byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
    });

    // Calculate storage by file type
    const storageByType = {
      pdfs: userDocs.filter(doc => doc.mimeType.includes('pdf')).reduce((total, doc) => total + doc.size, 0),
      images: userDocs.filter(doc => doc.mimeType.includes('image')).reduce((total, doc) => total + doc.size, 0),
      documents: userDocs.filter(doc => doc.mimeType.includes('document') || doc.mimeType.includes('msword') || doc.mimeType.includes('wordprocessingml')).reduce((total, doc) => total + doc.size, 0)
    };

    return {
      totalDocuments: userDocs.length,
      expiringSoon,
      storageUsed,
      byCategory,
      storageByType,
    };
  }
}

export const storage = new MemStorage();
