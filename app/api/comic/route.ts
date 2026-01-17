import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Get the latest comic to know the range
    const latestRes = await fetch('https://xkcd.com/info.0.json', {
      next: { revalidate: 60 },
    });
    if (!latestRes.ok) throw new Error('Failed to fetch latest info');
    const latestData = await latestRes.json();
    const maxNum = latestData.num;

    // 2. Pick a random number
    const randomId = Math.floor(Math.random() * maxNum) + 1;

    // 3. Fetch the random comic
    const comicRes = await fetch(`https://xkcd.com/${randomId}/info.0.json`, {
      cache: 'no-store',
    });
    if (!comicRes.ok) throw new Error('Failed to fetch comic');
    const comicData = await comicRes.json();

    return NextResponse.json(comicData);
  } catch (error) {
    console.error('Comic Fetch Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comic' },
      { status: 500 }
    );
  }
}
