import { NextResponse } from 'next/server';

export async function POST(req) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = 'mrbadstudent48-dev'; // আপনারটি দিন
    const REPO_NAME = 'apk-maker'; 

    try {
        const body = await req.json();
        const { action, runId, payload } = body;

        // ==========================================
        // নতুন লজিক: ওয়েবসাইটটি লাইভ কি না তার রিয়েল চেক
        // ==========================================
        if (action === 'check_url') {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // ৮ সেকেন্ড চেক করবে
                
                // ওয়েবসাইটটিতে ভিজিট করে রেসপন্স চেক করা হচ্ছে
                const checkRes = await fetch(payload.url, { method: 'GET', signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (checkRes.ok || checkRes.status < 500) {
                    return NextResponse.json({ live: true });
                } else {
                    return NextResponse.json({ live: false });
                }
            } catch (e) {
                // ওয়েবসাইট ডাউন থাকলে বা লিংক ভুল থাকলে এখানে আসবে
                return NextResponse.json({ live: false });
            }
        }

        // গিটহাব একশন লজিক (আগের মতোই)
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
