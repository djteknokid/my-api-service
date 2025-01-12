import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextResponse } from 'next/server';
console.log('MongoDB URI:', process.env.MONGODB_URI); 
const uri = process.env.MONGODB_URI!;

interface ChatHistory {
  messages: ChatMessage[];
  metadata?: {
    lastMessageId: string;
    participantCount: number;
  };
}

interface ChatMessage {
  id: string;
  message: string;
  timestamp: Date;
  sender: string;
}

interface Artboard {
  id: string;
  name: string;
  elements: Array<{
    id: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
  lastModified: Date;
}

interface Project {
  projectId: string;
  lastUpdated: Date;
  chatHistory?: ChatHistory;
  artboards?: Artboard[];
}

export async function GET() {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    console.log('Fetching all projects');
    const allProjects = await projects.find({}).toArray();
    return NextResponse.json({ projects: allProjects });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('DB Error:', error);
      return NextResponse.json({ 
        error: error.message,
        projects: [] 
      }, { status: 500 });
    }
    console.error('Unknown error:', error);
    return NextResponse.json({ 
      error: 'An unknown error occurred',
      projects: [] 
    }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(request: Request) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    const { projectId, chatHistory, artboards } = await request.json() as {
      projectId: string;
      chatHistory?: ChatHistory;
      artboards?: Artboard[];
    };

    console.log('Saving artboards under project:', { projectId, artboardCount: artboards?.length });
    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    const update: { $set: Partial<Project> } = {
      $set: {
        projectId,
        lastUpdated: new Date(),
        ...(chatHistory && { chatHistory }),
        ...(artboards && artboards.length > 0 && { artboards })
      }
    };

    const result = await projects.updateOne(
      { projectId },
      update,
      { upsert: true }
    );

    return NextResponse.json({
      message: "Project updated successfully",
      result
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('MongoDB save error:', error);
      return NextResponse.json({
        message: "Failed to update project",
        error: error.message
      }, { status: 500 });
    }
    console.error('Unknown error:', error);
    return NextResponse.json({
      message: "Failed to update project",
      error: 'An unknown error occurred'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}