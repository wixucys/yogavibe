export type FileOwnerType = 'user' | 'mentor' | 'booking' | 'note';
export type FileCategory =
  | 'avatar'
  | 'certificate'
  | 'medical_document'
  | 'booking_document'
  | 'note_attachment'
  | 'other';

export interface FileAttachmentApi {
  id: number;
  owner_type: FileOwnerType;
  owner_id: number;
  category: FileCategory;
  original_filename: string;
  stored_filename: string;
  file_url: string;
  mime_type?: string | null;
  size_bytes: number;
  uploaded_by_user_id: number;
  created_at: string;
}

export interface FileAttachment {
  id: number;
  ownerType: FileOwnerType;
  ownerId: number;
  category: FileCategory;
  originalFilename: string;
  storedFilename: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes: number;
  uploadedByUserId: number;
  createdAt: string;
}
