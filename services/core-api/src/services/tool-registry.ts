import axios from 'axios';

interface ToolDefinition {
  name: string;
  description: string;
  methods: string[];
}

interface ToolCall {
  tool: string;
  method: string;
  params: any;
}

interface ToolResult {
  success: boolean;
  data: any;
  error?: string;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition>;
  private taskTrackerURL: string;

  constructor() {
    this.tools = new Map();
    this.taskTrackerURL = process.env.TASK_TRACKER_URL || 'http://task-tracker:7718';
    
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    // Task Tracker
    this.tools.set('task_tracker', {
      name: 'task_tracker',
      description: 'Manage tasks and projects',
      methods: ['create_task', 'list_tasks', 'update_task', 'delete_task', 'get_dashboard']
    });

    // Calendar
    this.tools.set('calendar', {
      name: 'calendar',
      description: 'Calendar and scheduling',
      methods: ['create_event', 'list_events', 'update_event']
    });

    // System Info
    this.tools.set('system_info', {
      name: 'system_info',
      description: 'Get system status and metrics',
      methods: ['get_status', 'get_metrics']
    });
  }

  getAvailableTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const { tool, method, params } = toolCall;

    console.log(`🔧 Executing: ${tool}.${method}`, params);

    try {
      switch (tool) {
        case 'task_tracker':
          return await this.executeTaskTracker(method, params);
        
        case 'calendar':
          return await this.executeCalendar(method, params);
        
        case 'system_info':
          return await this.executeSystemInfo(method, params);
        
        default:
          return {
            success: false,
            data: null,
            error: `Unknown tool: ${tool}`
          };
      }
    } catch (error: any) {
      console.error(`Tool execution error (${tool}.${method}):`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  private async executeTaskTracker(method: string, params: any): Promise<ToolResult> {
    switch (method) {
      case 'create_task':
        const createResponse = await axios.post(`${this.taskTrackerURL}/api/tasks`, {
          title: params.title,
          description: params.description,
          priority: params.priority || 'medium',
          status: 'todo'
        });
        return {
          success: true,
          data: createResponse.data
        };

      case 'list_tasks':
        const listResponse = await axios.get(`${this.taskTrackerURL}/api/tasks`, {
          params: {
            status: params.status,
            priority: params.priority
          }
        });
        return {
          success: true,
          data: listResponse.data
        };

      case 'get_dashboard':
        const dashboardResponse = await axios.get(`${this.taskTrackerURL}/api/dashboard`);
        return {
          success: true,
          data: dashboardResponse.data
        };

      default:
        return {
          success: false,
          data: null,
          error: `Unknown method: ${method}`
        };
    }
  }

  private async executeCalendar(method: string, params: any): Promise<ToolResult> {
    // For now, return placeholder - calendar service archived
    // In production, this would call n8n webhook or calendar service
    return {
      success: true,
      data: {
        message: 'Calendar integration available through n8n workflows',
        method,
        params
      }
    };
  }

  private async executeSystemInfo(method: string, params: any): Promise<ToolResult> {
    return {
      success: true,
      data: {
        status: 'operational',
        services: ['task-tracker', 'n8n', 'gateway', 'core-api'],
        version: '0.5.0'
      }
    };
  }
}
