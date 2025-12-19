export interface TWatermark {
  _id: string;
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  isActive: boolean;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatermarkUploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
}
