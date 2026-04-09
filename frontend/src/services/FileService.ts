import ApiService, { ApiError } from './ApiService';
import type {
  FileAttachment,
  FileAttachmentApi,
  FileCategory,
} from '../types/file';

type FileScope = 'user' | 'mentor';

interface PaginatedResponse<T> {
  items: T[];
}

interface FileAccessUrlResponse {
  url: string;
  expires_in: number;
}

class FileService {
  private static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  private static getEndpoint(scope: FileScope): string {
    return scope === 'mentor' ? '/mentor/me/files' : '/users/me/files';
  }

  private static extractItems<T>(response: T[] | PaginatedResponse<T>): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.items)) {
      return response.items;
    }

    return [];
  }

  private static normalizeFile(file: FileAttachmentApi): FileAttachment {
    return {
      id: file.id,
      ownerType: file.owner_type,
      ownerId: file.owner_id,
      category: file.category,
      originalFilename: file.original_filename,
      storedFilename: file.stored_filename,
      fileUrl: file.file_url,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      uploadedByUserId: file.uploaded_by_user_id,
      createdAt: file.created_at,
    };
  }

  private static async toBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Не удалось прочитать файл'));
      };

      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  }

  private static validateFile(file: File): void {
    if (!file) {
      throw new Error('Файл не выбран');
    }

    if (file.size === 0) {
      throw new Error('Файл пуст');
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      throw new Error('Файл слишком большой. Максимальный размер — 10 МБ');
    }

    if (file.type && !this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Разрешены только PDF, JPG, PNG, GIF и WebP файлы');
    }
  }

  private static getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return 'Сессия истекла. Выполните вход заново';
      }

      if (error.status === 403) {
        return 'Недостаточно прав для доступа к этому файлу';
      }

      if (error.status === 404) {
        return 'Файл или профиль не найден';
      }

      if (error.status === 413) {
        return 'Файл слишком большой. Максимальный размер — 10 МБ';
      }

      if (error.status === 415) {
        return 'Разрешены только PDF, JPG, PNG, GIF и WebP файлы';
      }

      if (error.status === 502) {
        return 'Сервис хранения файлов временно недоступен';
      }

      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  static async listFiles(
    scope: FileScope,
    category?: FileCategory
  ): Promise<FileAttachment[]> {
    try {
      const query = category ? `?category=${encodeURIComponent(category)}` : '';
      const response = await ApiService.request<
        FileAttachmentApi[] | PaginatedResponse<FileAttachmentApi>
      >(`${this.getEndpoint(scope)}${query}`);

      return this.extractItems(response).map((file) => this.normalizeFile(file));
    } catch (error: unknown) {
      throw new Error(this.getErrorMessage(error, 'Не удалось загрузить файлы'));
    }
  }

  static async uploadFile(
    scope: FileScope,
    file: File,
    category: FileCategory
  ): Promise<FileAttachment> {
    try {
      this.validateFile(file);

      const contentBase64 = await this.toBase64(file);
      const response = await ApiService.request<FileAttachmentApi>(
        this.getEndpoint(scope),
        {
          method: 'POST',
          body: {
            filename: file.name,
            mime_type: file.type || undefined,
            content_base64: contentBase64,
            category,
          },
        }
      );

      return this.normalizeFile(response);
    } catch (error: unknown) {
      throw new Error(this.getErrorMessage(error, 'Не удалось загрузить файл'));
    }
  }

  static async deleteFile(scope: FileScope, fileId: number): Promise<void> {
    try {
      await ApiService.request(`${this.getEndpoint(scope)}/${fileId}`, {
        method: 'DELETE',
      });
    } catch (error: unknown) {
      throw new Error(this.getErrorMessage(error, 'Не удалось удалить файл'));
    }
  }

  static async getDownloadUrl(fileId: number): Promise<string> {
    try {
      const response = await ApiService.request<FileAccessUrlResponse>(
        `/files/${fileId}/download-url`
      );
      return response.url;
    } catch (error: unknown) {
      throw new Error(
        this.getErrorMessage(error, 'Не удалось подготовить ссылку на файл')
      );
    }
  }

  static isPreviewable(file: Pick<FileAttachment, 'mimeType' | 'originalFilename'>): boolean {
    const mimeType = file.mimeType?.toLowerCase() ?? '';
    const filename = file.originalFilename.toLowerCase();

    return (
      mimeType === 'application/pdf' ||
      mimeType.startsWith('image/') ||
      /\.(pdf|png|jpe?g|gif|webp)$/i.test(filename)
    );
  }

  static async openFile(
    file: Pick<FileAttachment, 'id' | 'originalFilename'>
  ): Promise<void> {
    const url = await this.getDownloadUrl(file.id);
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

    if (!openedWindow) {
      window.location.href = url;
    }
  }

  static async downloadFile(
    file: Pick<FileAttachment, 'id' | 'originalFilename'>
  ): Promise<void> {
    const url = await this.getDownloadUrl(file.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalFilename;
    link.rel = 'noreferrer';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} Б`;
    }

    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} КБ`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
  }
}

export default FileService;
