import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'NeoMCQ — Medical Board Exam Preparation';
    const subtitle = searchParams.get('subtitle') || 'High-Yield Clinical MCQs & Spaced Repetition';
    const type = searchParams.get('type') || 'exam';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: '#070B19',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #1a2244 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a2244 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '24px',
                }}
              >
                N
              </div>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                NeoMCQ
              </span>
            </div>

            <div
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#A5B4FC',
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {type === 'mcq' ? 'Clinical MCQ' : type === 'subject' ? 'Subject Guide' : type === 'topic' ? 'Topic Review' : 'Board Exam'}
            </div>
          </div>

          {/* Center Main Typography */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '950px' }}>
            <h1
              style={{
                fontSize: title.length > 50 ? '42px' : '56px',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.15,
                letterSpacing: '-1px',
                margin: 0,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: '24px',
                fontWeight: 500,
                color: '#94A3B8',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Bottom Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid #1E293B',
              paddingTop: '24px',
            }}
          >
            <span style={{ fontSize: '18px', color: '#64748B', fontWeight: 500 }}>
              AI-Powered Medical & Licensing Exam Preparation
            </span>
            <span style={{ fontSize: '18px', color: '#818CF8', fontWeight: 700 }}>
              neomcq.com
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
