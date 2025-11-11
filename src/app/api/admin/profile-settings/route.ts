import { NextRequest, NextResponse } from 'next/server';
import { getProfileSettings, saveProfileSettings, ProfileSettings } from '@/app/admin/settings/actions';

export async function GET() {
  try {
    const settings = await getProfileSettings();
    
    if (!settings) {
      // Retornar configurações padrão se não existirem
      const defaultSettings: ProfileSettings = {
        name: '',
        phone: '',
        email: '',
        address: '',
        profilePictureUrl: 'https://placeholder.co/150x150.png',
        coverPhotoUrl: 'https://placehold.co/1200x400.png',
        galleryPhotos: []
      };
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching profile settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: ProfileSettings = await request.json();
    
    await saveProfileSettings(settings);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving profile settings:', error);
    return NextResponse.json(
      { error: 'Failed to save profile settings' },
      { status: 500 }
    );
  }
}
