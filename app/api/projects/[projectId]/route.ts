import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI || "mongodb+srv://djteknokid:jisu0710@cluster0.ew4my.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
  request: NextRequest,
  { params }: { params: { projectId: string } } // Corrected type here
) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    const { projectId } = params;
    console.log('Fetching project:', projectId);

    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    const project = await projects.findOne({ projectId });
    return NextResponse.json(project || {});
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('DB Error:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error('Unknown error:', err);
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(request: NextRequest) {
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
      chatHistory?: ChatHistory[];
      artboards?: Artboard[];
    };

    console.log('Saving artboards under project:', { projectId, artboardCount: artboards?.length });
    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    const update: { $set: Project } = {
      $set: {
        projectId,
        lastUpdated: new Date(),
        ...(chatHistory && { chatHistory }),
        ...(artboards && { artboards })
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