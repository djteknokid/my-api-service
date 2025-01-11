import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI!;

interface ChatHistory {
  id: string;
  timestamp: Date;
  content: string;
  sender: string;
}

interface Artboard {
  id: string;
  name: string;
  content: unknown;
  lastModified: Date;
}

interface Project {
  projectId: string;
  lastUpdated: Date;
  chatHistory?: ChatHistory[];
  artboards?: Artboard[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    const { projectId } = await params;  // await the params
    console.log('Fetching project:', projectId);

    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    const project = await projects.findOne({ projectId });
    return NextResponse.json(project || {});
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('DB Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('Unknown error:', error);
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  } finally {
    await client.close();
  }
}