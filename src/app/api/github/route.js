import { NextResponse } from 'next/server';

export async function POST(req) {
    // Vercel-এ লাইভ করার সময় আমরা এগুলো সিক্রেট ভল্টে দিব
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = 'mrbadstudent48-dev';
    const REPO_NAME = 'apk-maker'; 

    try {
        const body = await req.json();
        const { action, runId, payload } = body;
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        };

        if (action === 'start_build') {
            const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/actions/workflows/apk-builder.yml/dispatches`, {
                method: 'POST', headers, body: JSON.stringify({ ref: 'main', inputs: payload })
            });
            if (!res.ok) throw new Error('Failed to start build');
            return NextResponse.json({ success: true });
        }
        else if (action === 'get_run_id') {
            const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/actions/workflows/apk-builder.yml/runs?per_page=1`, { headers });
            const data = await res.json();
            return NextResponse.json(data);
        }
        else if (action === 'check_status') {
            const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/actions/runs/${runId}`, { headers });
            const data = await res.json();
            return NextResponse.json(data);
        }
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}