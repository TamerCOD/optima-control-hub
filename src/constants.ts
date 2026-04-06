
import { Permission } from './types';

export const PERMISSION_GROUPS = {
    NAV: '1. Навигация (Меню)',
    DASH: '2. Дашборд',
    COURSE: '3. Обучение',
    TASK: '4. Задачи',
    ASSESS: '5. Аттестация',
    HISTORY: '6. Архив',
    SESS: '7. Управление Сессиями',
    KB: '8. База Знаний',
    USERS: '9. Сотрудники',
    REP: '10. Отчеты',
    ISSUES: '11. Инциденты',
    SYS: '12. Администрирование',
    DEPT: '13. Дела Отдела'
};

export const SYSTEM_PERMISSIONS: Permission[] = [
    // --- 1. НАВИГАЦИЯ ---
    { id: 'nav_dashboard', name: 'Вкладка: Дашборд', description: 'Доступ к экрану Дашборд', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_courses', name: 'Вкладка: Обучение', description: 'Доступ к разделу курсов', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_tasks', name: 'Вкладка: Задачи', description: 'Доступ к задачам', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_assess', name: 'Вкладка: Мои Тесты', description: 'Доступ к прохождению тестов', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_history', name: 'Вкладка: История', description: 'Доступ к архиву результатов', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_management', name: 'Блок: Управление', description: 'Видимость блока Управление в меню', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_sessions_manage', name: 'Вкладка: Сессии', description: 'Управление назначениями', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_kb', name: 'Вкладка: База Знаний', description: 'Банк вопросов', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_users', name: 'Вкладка: Персонал', description: 'Список сотрудников', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_reports', name: 'Вкладка: Аналитика', description: 'Отчеты и выгрузки', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_issues', name: 'Вкладка: Инциденты', description: 'Mass Issues Monitor', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_sync_dep', name: 'Вкладка: Синхронизация Отделов', description: 'Доступ к разделу Синхронизация Отделов', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_dept_affairs', name: 'Вкладка: Дела Отдела', description: 'Доступ к разделу Дела Отдела', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_system', name: 'Блок: Система', description: 'Видимость блока Система', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_roles', name: 'Вкладка: Права', description: 'Матрица доступа', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_depts', name: 'Вкладка: Филиалы', description: 'Структура компании', category: PERMISSION_GROUPS.NAV },
    { id: 'nav_config', name: 'Вкладка: Настройки', description: 'Глобальные настройки', category: PERMISSION_GROUPS.NAV },

    // --- 2. ДАШБОРД ---
    { id: 'dash_view_mine', name: 'Личные KPI', description: 'Видеть свою статистику', category: PERMISSION_GROUPS.DASH },
    { id: 'dash_view_dept', name: 'KPI Отдела', description: 'Видеть статистику своего отдела', category: PERMISSION_GROUPS.DASH },
    { id: 'dash_view_all', name: 'Глобальные KPI', description: 'Видеть статистику всей компании', category: PERMISSION_GROUPS.DASH },

    // --- 3. ОБУЧЕНИЕ ---
    { id: 'course_view', name: 'Просмотр списка', description: 'Видеть доступные курсы', category: PERMISSION_GROUPS.COURSE },
    { id: 'course_study', name: 'Прохождение', description: 'Открывать материалы', category: PERMISSION_GROUPS.COURSE },
    { id: 'course_create', name: 'Создание', description: 'Кнопка "Создать курс"', category: PERMISSION_GROUPS.COURSE },
    { id: 'course_edit', name: 'Редактирование', description: 'Изменять контент курсов', category: PERMISSION_GROUPS.COURSE },
    { id: 'course_delete', name: 'Удаление', description: 'Удалять курсы', category: PERMISSION_GROUPS.COURSE },
    { id: 'course_stats', name: 'Аналитика', description: 'Кнопка статистики курса', category: PERMISSION_GROUPS.COURSE },

    // --- 4. ЗАДАЧИ ---
    { id: 'tasks_view_mine', name: 'Свои задачи', description: 'Видеть задачи на мне', category: PERMISSION_GROUPS.TASK },
    { id: 'tasks_view_dept', name: 'Задачи отдела', description: 'Видеть задачи коллег', category: PERMISSION_GROUPS.TASK },
    { id: 'tasks_view_all', name: 'Все задачи', description: 'Видеть вообще все задачи', category: PERMISSION_GROUPS.TASK },
    { id: 'tasks_create', name: 'Создание', description: 'Создавать новые задачи', category: PERMISSION_GROUPS.TASK },
    { id: 'tasks_edit', name: 'Редактирование', description: 'Менять описание и поля', category: PERMISSION_GROUPS.TASK },
    { id: 'tasks_delete', name: 'Удаление', description: 'Удалять задачи', category: PERMISSION_GROUPS.TASK },
    { id: 'tasks_status', name: 'Смена статуса', description: 'Двигать по канбану', category: PERMISSION_GROUPS.TASK },
    { id: 'tasks_config', name: 'Настройка', description: 'Управлять проектами и полями', category: PERMISSION_GROUPS.TASK },

    // --- 5. АТТЕСТАЦИЯ ---
    { id: 'assess_pass', name: 'Запуск теста', description: 'Кнопка "Начать тест"', category: PERMISSION_GROUPS.ASSESS },
    { id: 'assess_view_result', name: 'Свой результат', description: 'Видеть балл после сдачи', category: PERMISSION_GROUPS.ASSESS },

    // --- 6. ИСТОРИЯ ---
    { id: 'archive_personal', name: 'Своя история', description: 'Видеть свои попытки', category: PERMISSION_GROUPS.HISTORY },
    { id: 'archive_dept', name: 'История отдела', description: 'Видеть результаты отдела', category: PERMISSION_GROUPS.HISTORY },
    { id: 'archive_general', name: 'Весь архив', description: 'Видеть результаты всех', category: PERMISSION_GROUPS.HISTORY },
    { id: 'archive_view_details', name: 'Детализация', description: 'Смотреть ответы на вопросы', category: PERMISSION_GROUPS.HISTORY },
    { id: 'archive_edit_result', name: 'Коррекция', description: 'Менять баллы вручную', category: PERMISSION_GROUPS.HISTORY },
    { id: 'archive_delete_result', name: 'Удаление', description: 'Удалять записи из архива', category: PERMISSION_GROUPS.HISTORY },

    // --- 7. СЕССИИ ---
    { id: 'sess_view', name: 'Просмотр', description: 'Видеть список сессий', category: PERMISSION_GROUPS.SESS },
    { id: 'sess_create', name: 'Создание', description: 'Назначать тестирования', category: PERMISSION_GROUPS.SESS },
    { id: 'sess_edit', name: 'Редактирование', description: 'Менять сроки и участников', category: PERMISSION_GROUPS.SESS },
    { id: 'sess_delete', name: 'Удаление', description: 'Удалять назначения', category: PERMISSION_GROUPS.SESS },
    { id: 'sess_random', name: 'Рандомайзер', description: 'Доступ к авто-распределению', category: PERMISSION_GROUPS.SESS },

    // --- 8. БАЗА ЗНАНИЙ ---
    { id: 'kb_view', name: 'Просмотр', description: 'Видеть список билетов', category: PERMISSION_GROUPS.KB },
    { id: 'kb_manage', name: 'Управление', description: 'Создавать/удалять билеты и вопросы', category: PERMISSION_GROUPS.KB },

    // --- 9. СОТРУДНИКИ ---
    { id: 'users_view', name: 'Просмотр', description: 'Видеть список людей', category: PERMISSION_GROUPS.USERS },
    { id: 'users_create', name: 'Создание', description: 'Добавлять сотрудников', category: PERMISSION_GROUPS.USERS },
    { id: 'users_edit', name: 'Редактирование', description: 'Менять данные и роли', category: PERMISSION_GROUPS.USERS },
    { id: 'users_delete', name: 'Удаление', description: 'Архивировать сотрудников', category: PERMISSION_GROUPS.USERS },
    { id: 'users_pwd_reset', name: 'Сброс пароля', description: 'Кнопка сброса пароля', category: PERMISSION_GROUPS.USERS },

    // --- 10. ОТЧЕТЫ ---
    { id: 'rep_view', name: 'Доступ', description: 'Видеть раздел аналитики', category: PERMISSION_GROUPS.REP },
    { id: 'rep_export', name: 'Экспорт', description: 'Скачивать Excel', category: PERMISSION_GROUPS.REP },
    { id: 'rep_public', name: 'Публ. ссылки', description: 'Генерировать ссылки', category: PERMISSION_GROUPS.REP },

    // --- 11. ИНЦИДЕНТЫ ---
    { id: 'issues_view', name: 'Просмотр', description: 'Видеть ленту сбоев', category: PERMISSION_GROUPS.ISSUES },
    { id: 'issue_manage', name: 'Управление', description: 'Создавать и закрывать инциденты', category: PERMISSION_GROUPS.ISSUES },

    // --- 12. СИСТЕМА ---
    { id: 'sys_manage', name: 'Полный доступ', description: 'Управление ролями и конфигом', category: PERMISSION_GROUPS.SYS },

    // --- 13. ДЕЛА ОТДЕЛА ---
    { id: 'sprints_view', name: 'Спринты: Просмотр', description: 'Видеть вкладку Спринты', category: PERMISSION_GROUPS.DEPT },
    { id: 'sprints_manage', name: 'Спринты: Управление', description: 'Редактировать спринты', category: PERMISSION_GROUPS.DEPT },
    { id: 'duties_view', name: 'Дежурства: Просмотр', description: 'Видеть график дежурств', category: PERMISSION_GROUPS.DEPT },
    { id: 'duties_manage', name: 'Дежурства: Управление', description: 'Редактировать график', category: PERMISSION_GROUPS.DEPT },
    { id: 'postcheck_view', name: 'Постпроверка: Просмотр', description: 'Видеть постпроверку', category: PERMISSION_GROUPS.DEPT },
    { id: 'postcheck_manage', name: 'Постпроверка: Управление', description: 'Редактировать постпроверку', category: PERMISSION_GROUPS.DEPT },
    { id: 'links_view', name: 'Ссылки: Просмотр', description: 'Видеть полезные ссылки', category: PERMISSION_GROUPS.DEPT },
    { id: 'links_manage', name: 'Ссылки: Управление', description: 'Редактировать ссылки', category: PERMISSION_GROUPS.DEPT },
];
