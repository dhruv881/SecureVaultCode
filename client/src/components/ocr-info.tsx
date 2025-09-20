import { Info, Camera, FileImage } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OcrInfo() {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-md">
            <Info className="text-blue-600 w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 text-sm">
              Automatic Expiry Date Detection
            </h4>
            <p className="text-blue-700 text-xs mt-1 mb-3">
              Upload BRP, Passport, or License documents for automatic expiry date scanning
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <FileImage className="w-3 h-3 mr-1" />
                  Images (JPG, PNG)
                </Badge>
                <span className="text-green-700">✅ Auto-scan enabled</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="border-orange-200 text-orange-700">
                  <Camera className="w-3 h-3 mr-1" />
                  PDFs
                </Badge>
                <span className="text-orange-700">⚠️ Convert to image for best results</span>
              </div>
            </div>
            
            <p className="text-xs text-blue-600 mt-2 font-medium">
              Tip: Take a photo of your document for instant expiry detection!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
