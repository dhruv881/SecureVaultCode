import { type User, type InsertUser, type Document, type InsertDocument, type Reminder, type InsertReminder, type Category, type InsertCategory } from "@shared/schema";
import { db } from "./db";
import { documents, users, reminders, categories } from "@shared/schema";
import { eq, and, desc, gte, lte, ilike, count } from "drizzle-orm";
import type { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Documents
  async getDocuments(userId: string): Promise<Document[]> {
    return await db.select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocument(id: string, userId: string): Promise<Document | undefined> {
    const result = await db.select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getDocumentsByCategory(userId: string, category: string): Promise<Document[]> {
    return await db.select()
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.category, category)))
      .orderBy(desc(documents.uploadedAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async updateDocument(id: string, userId: string, updates: Partial<Document>): Promise<Document | undefined> {
    const result = await db.update(documents)
      .set(updates)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning({ id: documents.id });
    return result.length > 0;
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    return await db.select()
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          ilike(documents.originalName, `%${query}%`)
        )
      )
      .orderBy(desc(documents.uploadedAt));
  }

  // Reminders
  async getReminders(userId: string): Promise<Reminder[]> {
    return await db.select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.reminderDate));
  }

  async getActiveReminders(userId: string): Promise<Reminder[]> {
    return await db.select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.isActive, true)))
      .orderBy(desc(reminders.reminderDate));
  }

  async getUpcomingReminders(userId: string, days: number): Promise<Reminder[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    return await db.select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.isActive, true),
          gte(reminders.reminderDate, now),
          lte(reminders.reminderDate, future)
        )
      )
      .orderBy(desc(reminders.reminderDate));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const result = await db.insert(reminders).values(reminder).returning();
    return result[0];
  }

  async updateReminder(id: string, userId: string, updates: Partial<Reminder>): Promise<Reminder | undefined> {
    const result = await db.update(reminders)
      .set(updates)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return result[0];
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  // Add method to get categories with counts
  async getCategoriesWithCounts(userId: string): Promise<Array<Category & { count: number }>> {
    // First get all categories
    const allCategories = await this.getCategories();
    
    // If no categories exist, create default ones
    if (allCategories.length === 0) {
      const defaultCategories = [
        { name: "Identity Documents", icon: "fas fa-id-card", color: "#3B82F6" },
        { name: "Bills & Utilities", icon: "fas fa-file-invoice-dollar", color: "#EF4444" },
        { name: "Medical Records", icon: "fas fa-user-md", color: "#10B981" },
        { name: "Receipts", icon: "fas fa-receipt", color: "#F59E0B" },
        { name: "Travel Documents", icon: "fas fa-plane", color: "#8B5CF6" },
        { name: "Insurance", icon: "fas fa-shield-alt", color: "#6366F1" },
      ];

      for (const cat of defaultCategories) {
        await this.createCategory(cat);
      }
      
      // Get categories again after creating defaults
      const categoriesAfterCreation = await this.getCategories();
      
      // Return with zero counts since no documents exist yet
      return categoriesAfterCreation.map(cat => ({ ...cat, count: 0 }));
    }

    // Get document counts per category for this user
    const categoryCountsQuery = await db
      .select({
        category: documents.category,
        count: count(documents.id)
      })
      .from(documents)
      .where(eq(documents.userId, userId))
      .groupBy(documents.category);

    const countMap: Record<string, number> = {};
    categoryCountsQuery.forEach(item => {
      countMap[item.category] = item.count;
    });

    return allCategories.map(cat => ({
      ...cat,
      count: countMap[cat.name] || 0
    }));
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
    const userDocs = await this.getDocuments(userId);
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