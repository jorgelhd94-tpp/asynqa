export namespace dashboard {
	
	export class DailyStats {
	    date: string;
	    processed: number;
	    failed: number;
	
	    static createFrom(source: any = {}) {
	        return new DailyStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.processed = source["processed"];
	        this.failed = source["failed"];
	    }
	}
	export class QueueStats {
	    queue: string;
	    size: number;
	    pending: number;
	    active: number;
	    scheduled: number;
	    retry: number;
	    archived: number;
	    completed: number;
	    processed: number;
	    failed: number;
	    processedTotal: number;
	    failedTotal: number;
	    latencyMs: number;
	    memoryUsage: number;
	    paused: boolean;
	
	    static createFrom(source: any = {}) {
	        return new QueueStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queue = source["queue"];
	        this.size = source["size"];
	        this.pending = source["pending"];
	        this.active = source["active"];
	        this.scheduled = source["scheduled"];
	        this.retry = source["retry"];
	        this.archived = source["archived"];
	        this.completed = source["completed"];
	        this.processed = source["processed"];
	        this.failed = source["failed"];
	        this.processedTotal = source["processedTotal"];
	        this.failedTotal = source["failedTotal"];
	        this.latencyMs = source["latencyMs"];
	        this.memoryUsage = source["memoryUsage"];
	        this.paused = source["paused"];
	    }
	}
	export class DashboardData {
	    queues: QueueStats[];
	    totalTasks: number;
	    totalPending: number;
	    totalActive: number;
	    totalFailed: number;
	    history: DailyStats[];
	    serverCount: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queues = this.convertValues(source["queues"], QueueStats);
	        this.totalTasks = source["totalTasks"];
	        this.totalPending = source["totalPending"];
	        this.totalActive = source["totalActive"];
	        this.totalFailed = source["totalFailed"];
	        this.history = this.convertValues(source["history"], DailyStats);
	        this.serverCount = source["serverCount"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace domain {
	
	export class Environment {
	    ID: number;
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    Name: string;
	    Host: string;
	    Password: string;
	    DB: number;
	    UseTLS: boolean;
	    TLSSkipVerify: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Environment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.Name = source["Name"];
	        this.Host = source["Host"];
	        this.Password = source["Password"];
	        this.DB = source["DB"];
	        this.UseTLS = source["UseTLS"];
	        this.TLSSkipVerify = source["TLSSkipVerify"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace queue {
	
	export class BulkActionResult {
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new BulkActionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.count = source["count"];
	    }
	}
	export class DailyStats {
	    date: string;
	    processed: number;
	    failed: number;
	
	    static createFrom(source: any = {}) {
	        return new DailyStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.processed = source["processed"];
	        this.failed = source["failed"];
	    }
	}
	export class TaskInfo {
	    id: string;
	    queue: string;
	    type: string;
	    payload: string;
	    state: string;
	    maxRetry: number;
	    retried: number;
	    lastErr: string;
	    lastFailedAt: string;
	    nextProcessAt: string;
	    timeoutSecs: number;
	    retentionSecs: number;
	    deadline: string;
	    completedAt: string;
	    group: string;
	    result: string;
	    isOrphaned: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TaskInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.queue = source["queue"];
	        this.type = source["type"];
	        this.payload = source["payload"];
	        this.state = source["state"];
	        this.maxRetry = source["maxRetry"];
	        this.retried = source["retried"];
	        this.lastErr = source["lastErr"];
	        this.lastFailedAt = source["lastFailedAt"];
	        this.nextProcessAt = source["nextProcessAt"];
	        this.timeoutSecs = source["timeoutSecs"];
	        this.retentionSecs = source["retentionSecs"];
	        this.deadline = source["deadline"];
	        this.completedAt = source["completedAt"];
	        this.group = source["group"];
	        this.result = source["result"];
	        this.isOrphaned = source["isOrphaned"];
	    }
	}
	export class PaginatedTaskList {
	    tasks: TaskInfo[];
	    totalCount: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new PaginatedTaskList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tasks = this.convertValues(source["tasks"], TaskInfo);
	        this.totalCount = source["totalCount"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class QueueInfo {
	    queue: string;
	    size: number;
	    pending: number;
	    active: number;
	    scheduled: number;
	    retry: number;
	    archived: number;
	    completed: number;
	    processed: number;
	    failed: number;
	    processedTotal: number;
	    failedTotal: number;
	    latencyMs: number;
	    memoryUsage: number;
	    paused: boolean;
	
	    static createFrom(source: any = {}) {
	        return new QueueInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queue = source["queue"];
	        this.size = source["size"];
	        this.pending = source["pending"];
	        this.active = source["active"];
	        this.scheduled = source["scheduled"];
	        this.retry = source["retry"];
	        this.archived = source["archived"];
	        this.completed = source["completed"];
	        this.processed = source["processed"];
	        this.failed = source["failed"];
	        this.processedTotal = source["processedTotal"];
	        this.failedTotal = source["failedTotal"];
	        this.latencyMs = source["latencyMs"];
	        this.memoryUsage = source["memoryUsage"];
	        this.paused = source["paused"];
	    }
	}
	export class QueueDetailData {
	    info: QueueInfo;
	    history: DailyStats[];
	
	    static createFrom(source: any = {}) {
	        return new QueueDetailData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.info = this.convertValues(source["info"], QueueInfo);
	        this.history = this.convertValues(source["history"], DailyStats);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class QueuesData {
	    queues: QueueInfo[];
	    totalQueues: number;
	    activeQueues: number;
	    pausedQueues: number;
	    totalTasks: number;
	
	    static createFrom(source: any = {}) {
	        return new QueuesData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queues = this.convertValues(source["queues"], QueueInfo);
	        this.totalQueues = source["totalQueues"];
	        this.activeQueues = source["activeQueues"];
	        this.pausedQueues = source["pausedQueues"];
	        this.totalTasks = source["totalTasks"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace redis {
	
	export class RedisEntry {
	    key: string;
	    value: string;
	
	    static createFrom(source: any = {}) {
	        return new RedisEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	    }
	}
	export class RedisSection {
	    name: string;
	    entries: RedisEntry[];
	
	    static createFrom(source: any = {}) {
	        return new RedisSection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.entries = this.convertValues(source["entries"], RedisEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RedisInfoData {
	    sections: RedisSection[];
	    rawInfo: string;
	
	    static createFrom(source: any = {}) {
	        return new RedisInfoData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sections = this.convertValues(source["sections"], RedisSection);
	        this.rawInfo = source["rawInfo"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace scheduler {
	
	export class EnqueueEvent {
	    taskID: string;
	    enqueuedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new EnqueueEvent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.taskID = source["taskID"];
	        this.enqueuedAt = source["enqueuedAt"];
	    }
	}
	export class PaginatedEvents {
	    events: EnqueueEvent[];
	    totalCount: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new PaginatedEvents(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.events = this.convertValues(source["events"], EnqueueEvent);
	        this.totalCount = source["totalCount"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RunResult {
	    taskID: string;
	    queue: string;
	
	    static createFrom(source: any = {}) {
	        return new RunResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.taskID = source["taskID"];
	        this.queue = source["queue"];
	    }
	}
	export class SchedulerEntry {
	    id: string;
	    spec: string;
	    taskType: string;
	    taskPayload: string;
	    options: string[];
	    nextEnqueueAt: string;
	    prevEnqueueAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SchedulerEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.spec = source["spec"];
	        this.taskType = source["taskType"];
	        this.taskPayload = source["taskPayload"];
	        this.options = source["options"];
	        this.nextEnqueueAt = source["nextEnqueueAt"];
	        this.prevEnqueueAt = source["prevEnqueueAt"];
	    }
	}
	export class SchedulersData {
	    entries: SchedulerEntry[];
	
	    static createFrom(source: any = {}) {
	        return new SchedulersData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.entries = this.convertValues(source["entries"], SchedulerEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace taskrunner {
	
	export class CreateSavedRequestInput {
	    name: string;
	    queue: string;
	    taskType: string;
	    payload: string;
	    maxRetry: number;
	    timeoutSecs: number;
	    delaySecs: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateSavedRequestInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.queue = source["queue"];
	        this.taskType = source["taskType"];
	        this.payload = source["payload"];
	        this.maxRetry = source["maxRetry"];
	        this.timeoutSecs = source["timeoutSecs"];
	        this.delaySecs = source["delaySecs"];
	    }
	}
	export class EnqueueRequest {
	    queue: string;
	    taskType: string;
	    payload: string;
	    maxRetry: number;
	    timeoutSecs: number;
	    delaySecs: number;
	
	    static createFrom(source: any = {}) {
	        return new EnqueueRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queue = source["queue"];
	        this.taskType = source["taskType"];
	        this.payload = source["payload"];
	        this.maxRetry = source["maxRetry"];
	        this.timeoutSecs = source["timeoutSecs"];
	        this.delaySecs = source["delaySecs"];
	    }
	}
	export class EnqueueResult {
	    taskID: string;
	
	    static createFrom(source: any = {}) {
	        return new EnqueueResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.taskID = source["taskID"];
	    }
	}
	export class RenameSavedRequestInput {
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new RenameSavedRequestInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	    }
	}
	export class SavedRequest {
	    id: number;
	    environmentId: number;
	    name: string;
	    queue: string;
	    taskType: string;
	    payload: string;
	    maxRetry: number;
	    timeoutSecs: number;
	    delaySecs: number;
	
	    static createFrom(source: any = {}) {
	        return new SavedRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.environmentId = source["environmentId"];
	        this.name = source["name"];
	        this.queue = source["queue"];
	        this.taskType = source["taskType"];
	        this.payload = source["payload"];
	        this.maxRetry = source["maxRetry"];
	        this.timeoutSecs = source["timeoutSecs"];
	        this.delaySecs = source["delaySecs"];
	    }
	}
	export class UpdateSavedRequestInput {
	    name: string;
	    queue: string;
	    taskType: string;
	    payload: string;
	    maxRetry: number;
	    timeoutSecs: number;
	    delaySecs: number;
	
	    static createFrom(source: any = {}) {
	        return new UpdateSavedRequestInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.queue = source["queue"];
	        this.taskType = source["taskType"];
	        this.payload = source["payload"];
	        this.maxRetry = source["maxRetry"];
	        this.timeoutSecs = source["timeoutSecs"];
	        this.delaySecs = source["delaySecs"];
	    }
	}

}

export namespace updater {
	
	export class UpdateInfo {
	    available: boolean;
	    currentVersion: string;
	    latestVersion: string;
	    releaseNotes: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseNotes = source["releaseNotes"];
	        this.url = source["url"];
	    }
	}

}

export namespace worker {
	
	export class WorkerInfo {
	    taskID: string;
	    queue: string;
	    type: string;
	    payload: string;
	    started: string;
	
	    static createFrom(source: any = {}) {
	        return new WorkerInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.taskID = source["taskID"];
	        this.queue = source["queue"];
	        this.type = source["type"];
	        this.payload = source["payload"];
	        this.started = source["started"];
	    }
	}
	export class ServerInfo {
	    id: string;
	    host: string;
	    pid: number;
	    queues: string[];
	    strictPriority: boolean;
	    started: string;
	    status: string;
	    concurrency: number;
	    activeWorkers: WorkerInfo[];
	
	    static createFrom(source: any = {}) {
	        return new ServerInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.host = source["host"];
	        this.pid = source["pid"];
	        this.queues = source["queues"];
	        this.strictPriority = source["strictPriority"];
	        this.started = source["started"];
	        this.status = source["status"];
	        this.concurrency = source["concurrency"];
	        this.activeWorkers = this.convertValues(source["activeWorkers"], WorkerInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class WorkersData {
	    servers: ServerInfo[];
	    totalWorkers: number;
	
	    static createFrom(source: any = {}) {
	        return new WorkersData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.servers = this.convertValues(source["servers"], ServerInfo);
	        this.totalWorkers = source["totalWorkers"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

