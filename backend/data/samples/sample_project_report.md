# Placement Readiness Chatbot - Project Report (SAMPLE DATA)

## Overview
A retrieval-augmented chatbot that answers students' placement questions from uploaded notes and company documents.

## Architecture
The backend uses FastAPI with Python. Documents are chunked and embedded, then stored in a vector index. Metadata and user sessions are stored in MongoDB.

## Evaluation
We built a test set of 40 questions with known source passages. Retrieval was measured with recall at k and mean reciprocal rank. Hybrid retrieval improved recall over vector-only search. Answers cite their source passages and the bot abstains when evidence is weak.

## Lessons
Prompt engineering mattered less than chunking quality. Deployment used Docker on a small cloud VM.
