import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI!;

const allowedOrigins = ['http://localhost:3001', 'https://serve-dot-zipline.appspot.com/asset/a1c55a9d-1d13-5528-a560-23f2112a947c/zpc/htvt5n7qh96/'];

// CORS utility
function setCorsHeaders(origin: string | null) {
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Preflight CORS handler
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return NextResponse.json({}, { headers: setCorsHeaders(origin) });
}

// GET: Fetch project by projectId
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const origin = request.headers.get('origin');
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Extract `projectId` directly without awaiting `params`
    const { projectId } = params;
    console.log('GET endpoint hit for projectId:', projectId);

    // Connect to the database
    await client.connect();
    const db = client.db('test');
    const projects = db.collection('projects');

    // Fetch the project with the provided projectId
    const project = await projects.findOne({ projectId });

    if (!project) {
      console.error(`Project with ID ${projectId} not found`);
      return NextResponse.json(
        { message: `Project ${projectId} not found` },
        { status: 404, headers: setCorsHeaders(origin) }
      );
    }

    return NextResponse.json(project, { headers: setCorsHeaders(origin) });
  } catch (err) {
    console.error('Error fetching project:', {
      message: err instanceof Error ? err.message : 'Unknown error occurred',
      stack: err instanceof Error ? err.stack : null,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500, headers: setCorsHeaders(origin) }
    );
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing MongoDB client:', closeError);
    }
  }
}
