// src/app/api/upload-drive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionName = (formData.get('sessionName') as string) || `Session_${Date.now()}`;
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada file foto yang dikirim.' },
        { status: 400 }
      );
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    const isPlaceholder =
      !clientEmail ||
      !privateKey ||
      !parentFolderId ||
      privateKey.includes('ISI_PRIVATE_KEY_ANDA_DI_SINI') ||
      clientEmail.includes('nama-service-account') ||
      parentFolderId.includes('ID_FOLDER_UTAMA_ANDA');

    if (isPlaceholder) {
      return NextResponse.json({
        success: false,
        isPlaceholder: true,
        error:
          'Kredensial Google Service Account di .env.local masih berupa placeholder template. Silakan masukkan key asli untuk mengaktifkan cloud upload.',
      });
    }

    // 1. Autentikasi Google Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 2. Buat Sub-folder Baru untuk Sesi Ini di Dalam Folder Utama
    const folderResponse = await drive.files.create({
      requestBody: {
        name: sessionName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id, webViewLink',
    });

    const sessionFolderId = folderResponse.data.id;
    if (!sessionFolderId) {
      throw new Error('Gagal membuat sub-folder sesi di Google Drive.');
    }

    // 3. Upload 6 Foto Mentah Secara Paralel ke Sub-folder Tersebut
    const uploadPromises = files.map(async (file, index) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadedFile = await drive.files.create({
        requestBody: {
          name: `RAW_SLOT_${index + 1}_${sessionName}.jpg`,
          parents: [sessionFolderId],
        },
        media: {
          mimeType: file.type || 'image/jpeg',
          body: Readable.from(buffer),
        },
        fields: 'id, name',
      });

      return uploadedFile.data;
    });

    const uploadedResults = await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      folderId: sessionFolderId,
      folderLink: folderResponse.data.webViewLink,
      uploadedCount: uploadedResults.length,
      files: uploadedResults,
    });
  } catch (error: unknown) {
    console.error('Google Drive Upload Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}