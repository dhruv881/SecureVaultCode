import { Document } from "@shared/schema";

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
  if (mimeType.includes('image')) return 'fas fa-file-image';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fas fa-file-powerpoint';
  return 'fas fa-file-alt';
};

export const getFileIconColor = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return 'text-red-600';
  if (mimeType.includes('image')) return 'text-green-600';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-600';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'text-emerald-600';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'text-orange-600';
  return 'text-gray-600';
};

export const categorizeByFilename = (filename: string): string => {
  const name = filename.toLowerCase();
  
  if (name.includes('passport') || name.includes('license') || name.includes('id') || name.includes('driver')) {
    return 'Identity Documents';
  }
  
  if (name.includes('bill') || name.includes('utility') || name.includes('invoice') || name.includes('statement')) {
    return 'Bills & Utilities';
  }
  
  if (name.includes('medical') || name.includes('health') || name.includes('doctor') || name.includes('prescription')) {
    return 'Medical Records';
  }
  
  if (name.includes('receipt') || name.includes('purchase') || name.includes('warranty')) {
    return 'Receipts';
  }
  
  if (name.includes('ticket') || name.includes('visa') || name.includes('travel') || name.includes('itinerary')) {
    return 'Travel Documents';
  }
  
  if (name.includes('insurance') || name.includes('policy') || name.includes('claim')) {
    return 'Insurance';
  }
  
  return 'Receipts'; // Default category
};

export const extractExpiryFromFilename = (filename: string): Date | null => {
  // Look for date patterns in filename
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/g, // YYYY-MM-DD
    /(\d{2}\/\d{2}\/\d{4})/g, // MM/DD/YYYY
    /(\d{2}-\d{2}-\d{4})/g, // MM-DD-YYYY
  ];
  
  for (const pattern of datePatterns) {
    const matches = filename.match(pattern);
    if (matches) {
      const dateStr = matches[0];
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date > new Date()) {
        return date;
      }
    }
  }
  
  return null;
};

export const getExpiryStatus = (expiryDate: Date | null): {
  status: 'expired' | 'expiring-soon' | 'expiring-later' | 'active';
  label: string;
  variant: 'destructive' | 'secondary' | 'outline' | 'default';
} => {
  if (!expiryDate) {
    return {
      status: 'active',
      label: 'Active',
      variant: 'outline'
    };
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffInDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    return {
      status: 'expired',
      label: 'Expired',
      variant: 'destructive'
    };
  } else if (diffInDays <= 7) {
    return {
      status: 'expiring-soon',
      label: 'Expires in 1 week',
      variant: 'destructive'
    };
  } else if (diffInDays <= 30) {
    return {
      status: 'expiring-soon',
      label: `Expires in ${diffInDays} days`,
      variant: 'secondary'
    };
  } else if (diffInDays <= 90) {
    return {
      status: 'expiring-later',
      label: `Expires in ${Math.ceil(diffInDays / 30)} months`,
      variant: 'outline'
    };
  }

  return {
    status: 'active',
    label: 'Active',
    variant: 'outline'
  };
};

export const searchDocuments = (documents: Document[], query: string): Document[] => {
  if (!query.trim()) return documents;

  const lowerQuery = query.toLowerCase();
  
  return documents.filter(doc => 
    doc.originalName.toLowerCase().includes(lowerQuery) ||
    doc.category.toLowerCase().includes(lowerQuery) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    (doc.metadata && JSON.stringify(doc.metadata).toLowerCase().includes(lowerQuery))
  );
};

export const groupDocumentsByCategory = (documents: Document[]): Record<string, Document[]> => {
  return documents.reduce((groups, doc) => {
    const category = doc.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(doc);
    return groups;
  }, {} as Record<string, Document[]>);
};
