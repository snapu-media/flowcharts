import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    // Verify environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { toEmails, taskName, flowchartName, assignedBy } = body;

    // Validate required fields
    if (!toEmails || !taskName || !flowchartName || !assignedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Task Manager" <${process.env.EMAIL_USER}>`,
      to: toEmails.join(', '),
      subject: `New Task Assigned: ${taskName}`,
      html: `
        <h1>You've been assigned to a new task</h1>
        <p><strong>Task Name:</strong> ${taskName}</p>
        <p><strong>Flowchart:</strong> ${flowchartName}</p>
        <p><strong>Assigned By:</strong> ${assignedBy}</p>
        <p>Please check your task list for more details.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}