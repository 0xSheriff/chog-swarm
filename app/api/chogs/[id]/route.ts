import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId) || numId < 1 || numId > 1969) {
      return NextResponse.json({ error: 'Token ID must be between 1 and 1969' }, { status: 400 });
    }

    const filePath = path.resolve(process.cwd(), `data/metadata/${numId}.json`);
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return NextResponse.json({ tokenId: numId, ...content });
    }

    return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
