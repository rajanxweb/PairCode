import dotenv from 'dotenv';
dotenv.config();

export interface Judge0SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  cpu_time_limit?: number;
  wall_time_limit?: number;
  memory_limit?: number;
}

export interface Judge0SubmissionResponse {
  token: string;
}

export interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status: {
    id: number;
    description: string;
  };
}

export class Judge0Client {
  private baseUrl: string;
  private apiKey: string | null;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl || process.env.JUDGE0_BASE_URL || 'https://ce.judge0.com').replace(/\/$/, '');
    this.apiKey = apiKey || process.env.JUDGE0_API_KEY || null;
  }

  getLanguageId(language: string): number {
    if (language === 'python') {
      return parseInt(process.env.JUDGE0_LANGUAGE_ID_PYTHON || '71', 10);
    }
    if (language === 'javascript') {
      return parseInt(process.env.JUDGE0_LANGUAGE_ID_JAVASCRIPT || '63', 10);
    }
    throw new Error(`Unsupported programming language: ${language}`);
  }

  async submit(req: Judge0SubmissionRequest): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-Auth-Token'] = this.apiKey;
    }

    const payload = {
      source_code: req.source_code,
      language_id: req.language_id,
      stdin: req.stdin || '',
      cpu_time_limit: req.cpu_time_limit || parseFloat(process.env.EXECUTION_CPU_TIME_LIMIT || '5.0'),
      wall_time_limit: req.wall_time_limit || parseFloat(process.env.EXECUTION_WALL_TIME_LIMIT || '10.0'),
      memory_limit: req.memory_limit || parseInt(process.env.EXECUTION_MEMORY_LIMIT_KB || '128000', 10),
    };

    const url = `${this.baseUrl}/submissions?base64_encoded=false&wait=false`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Judge0 submission failed [${res.status}]: ${errText}`);
    }

    const data = (await res.json()) as Judge0SubmissionResponse;
    if (!data.token) {
      throw new Error('Judge0 returned invalid response without submission token.');
    }

    return data.token;
  }

  async pollResult(token: string, maxWaitMs = 15000, pollIntervalMs = 500): Promise<Judge0Result> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['X-Auth-Token'] = this.apiKey;
    }

    const startTime = Date.now();
    const url = `${this.baseUrl}/submissions/${token}?base64_encoded=false`;

    while (Date.now() - startTime < maxWaitMs) {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Judge0 poll failed [${res.status}]`);
      }

      const result = (await res.json()) as Judge0Result;
      // Status ID 1 (In Queue) and 2 (Processing) mean still executing
      if (result.status && result.status.id > 2) {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Execution timed out waiting for Judge0 sandbox result.');
  }
}

