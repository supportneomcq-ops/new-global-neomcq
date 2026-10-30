import { NextRequest, NextResponse } from 'next/server';

// In-memory scheduler state for simulation mode
let schedulerState = {
  active: false,
  profilesPerHour: 15,
  ticketsPerHour: 8,
  lastRun: null as string | null,
  totalGeneratedProfiles: 0,
  totalGeneratedTickets: 0,
};

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    scheduler: schedulerState,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, profilesPerHour, ticketsPerHour } = body; // action: 'start' | 'stop' | 'update' | 'trigger_batch'

    if (profilesPerHour) schedulerState.profilesPerHour = Number(profilesPerHour);
    if (ticketsPerHour) schedulerState.ticketsPerHour = Number(ticketsPerHour);

    if (action === 'start') {
      schedulerState.active = true;
      schedulerState.lastRun = new Date().toISOString();
    } else if (action === 'stop') {
      schedulerState.active = false;
    } else if (action === 'trigger_batch') {
      schedulerState.totalGeneratedProfiles += schedulerState.profilesPerHour;
      schedulerState.totalGeneratedTickets += schedulerState.ticketsPerHour;
      schedulerState.lastRun = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      message: `Scheduler action '${action || 'update'}' executed successfully.`,
      scheduler: schedulerState,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update scheduler' }, { status: 500 });
  }
}
