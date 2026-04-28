
import { AssessmentResult, Department, RoleDefinition, User, ProjectTask } from "../types";

/**
 * Sanitizes Question Stats
 */
export const sanitizeForSnapshot = (questionStats: any[]) => {
    const LIMIT = 50;
    const trimMap = (map: Record<string, string[]>) => {
        const newMap: Record<string, string[]> = {};
        Object.entries(map).forEach(([key, val]) => { newMap[key] = val.slice(0, LIMIT); });
        return newMap;
    };
    return questionStats.map((q: any) => {
        const { wrongUserIds, ...rest } = q;
        return {
            ...rest,
            deptBreakdown: trimMap(rest.deptBreakdown),
            roleBreakdown: trimMap(rest.roleBreakdown),
            optionsBreakdown: rest.optionsBreakdown.map((o: any) => ({ ...o, userNames: o.userNames ? o.userNames.slice(0, LIMIT) : [] }))
        };
    });
};

export const generateAllDeptRankings = (users: User[], results: AssessmentResult[], departments: Department[], roles: RoleDefinition[]) => {
    const rankings: Record<string, { top15: any[], bottom15: any[] }> = {};
    departments.forEach(dept => {
        const deptUsers = users.filter(u => u.departmentId === dept.id);
        const userStats = deptUsers.map(u => {
            const userResults = results.filter(r => r.userId === u.id);
            if (userResults.length === 0) return null;
            const totalPct = userResults.reduce((acc, r) => acc + ((r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100), 0);
            return { id: u.id, name: u.name, roleName: u.roles.map(rid => roles.find(r => r.id === rid)?.name).join(', '), avgScore: Number((totalPct / userResults.length).toFixed(2)), count: userResults.length };
        }).filter(u => u !== null) as any[];
        userStats.sort((a, b) => b.avgScore - a.avgScore);
        rankings[dept.id] = { top15: userStats.slice(0, 15), bottom15: [...userStats].reverse().slice(0, 15) };
    });
    return rankings;
};

// Mock data for initial tasks demo
export const MOCK_TASKS: ProjectTask[] = [
    {
        id: 'task_1',
        key: 'EDU-101',
        title: 'Разработать модуль обучения для новых сотрудников',
        description: 'Необходимо создать структуру курса, добавить 10 билетов и настроить автоматическое распределение.',
        status: 'in_progress',
        priority: 'highest',
        type: 'story',
        projectId: 'p_1',
        parentId: null,
        assigneeId: 'admin_uid',
        reporterId: 'admin_uid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startDate: null,
        endDate: null,
        tags: ['Onboarding', 'Content'],
        components: ['Frontend'],
        attachments: [],
        comments: [],
        auditLog: [],
        customFieldValues: {},
        links: [],
        subtaskIds: [],
        checklist: [],
        dependencies: []
    },
    {
        id: 'task_2',
        key: 'EDU-102',
        title: 'Баг: Некорректное отображение графиков в темной теме',
        description: 'В разделе Аналитика при переключении на темную тему линии графиков сливаются с фоном.',
        status: 'todo',
        priority: 'high',
        type: 'bug',
        projectId: 'p_1',
        parentId: null,
        assigneeId: 'admin_uid',
        reporterId: 'admin_uid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startDate: null,
        endDate: null,
        tags: ['UI', 'Analytics'],
        components: ['Frontend'],
        attachments: [],
        comments: [],
        auditLog: [],
        customFieldValues: {},
        links: [],
        subtaskIds: [],
        checklist: [],
        dependencies: []
    }
];
