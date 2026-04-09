import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, CheckSquare, MessageSquare, Clock, LayoutDashboard, Building, Globe, ChevronRight, Send, X, GripVertical } from 'lucide-react';


export const UserGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employee' | 'moderator' | 'admin'>('employee');

  const Path = ({ steps }: { steps: string[] }) => (
    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700/50 mb-4">
      <span className="text-zinc-400 dark:text-zinc-500">Путь:</span>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <span className={index === steps.length - 1 ? 'text-primary font-bold' : 'text-zinc-800 dark:text-zinc-200'}>
            {step}
          </span>
          {index < steps.length - 1 && <ChevronRight size={14} className="text-zinc-400" />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-black">
      <div className="shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-3 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Полное руководство пользователя</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Подробные инструкции по работе с системой Синхронизации Отделов</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-3">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('employee')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'employee' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Я — Сотрудник
            </button>
            <button
              onClick={() => setActiveTab('moderator')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'moderator' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Я — Модератор
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'admin' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Я — Администратор
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 space-y-16 shadow-sm">
            
            {/* Section 1: Navigation */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <LayoutDashboard size={24} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">1. Структура и навигация</h2>
              </div>
              
              <Path steps={['Левое боковое меню', 'Выбор нужного раздела']} />
              
              <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed">
                <p>
                  Система разделена на несколько ключевых экранов. Доступ к ним зависит от вашей роли. 
                  Для навигации используйте левое боковое меню (на мобильных устройствах оно открывается по кнопке-бургеру в левом верхнем углу).
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 list-none pl-0">
                  <li className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <strong className="flex items-center gap-2 text-zinc-900 dark:text-white mb-2">
                      <CheckSquare size={16} className="text-primary" /> Мои задачи
                    </strong>
                    Здесь отображаются <b>только те задачи, где вы указаны исполнителем</b>. Это ваше личное рабочее пространство.
                  </li>
                  <li className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <strong className="flex items-center gap-2 text-zinc-900 dark:text-white mb-2">
                      <Building size={16} className="text-primary" /> Задачи отдела
                    </strong>
                    Здесь видны <b>все задачи вашего отдела</b>. Вы можете видеть, над чем работают коллеги, и помогать им.
                  </li>
                  {(activeTab === 'moderator' || activeTab === 'admin') && (
                    <li className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <strong className="flex items-center gap-2 text-zinc-900 dark:text-white mb-2">
                        <Globe size={16} className="text-primary" /> Все задачи (Общий вид)
                      </strong>
                      Доступно модераторам и админам. Позволяет видеть задачи <b>всех отделов компании</b> на одной доске.
                    </li>
                  )}
                  <li className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <strong className="flex items-center gap-2 text-zinc-900 dark:text-white mb-2">
                      <LayoutDashboard size={16} className="text-primary" /> Дашборды и Аналитика
                    </strong>
                    Сводная статистика: сколько задач выполнено, сколько просрочено, общая эффективность отдела.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2: Creating Tasks */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                  <Plus size={24} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">2. Как заливать (создавать) задачи</h2>
              </div>

              <Path steps={['Задачи отдела (или Мои задачи)', 'Кнопка "Создать задачу" (справа вверху)', 'Заполнение формы', 'Сохранить']} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed">
                  <p>
                    {activeTab === 'employee' 
                      ? 'Сотрудники могут создавать задачи только внутри своего отдела. Вы не можете назначить задачу на другой отдел напрямую.' 
                      : 'Вы можете создавать задачи для любых отделов и назначать на них любых сотрудников компании.'}
                  </p>
                  <ol className="space-y-2 mt-4">
                    <li>Нажмите синюю кнопку <b>"Создать задачу"</b> в правом верхнем углу экрана.</li>
                    <li>В открывшемся окне обязательно заполните <b>Название задачи</b> (кратко и суть).</li>
                    <li>Выберите <b>Отдел</b> {activeTab === 'employee' ? '(по умолчанию стоит ваш)' : '(доступны все отделы)'}.</li>
                    <li>Добавьте подробное <b>Описание</b>, чтобы исполнитель понял, что нужно сделать.</li>
                    <li>Выберите <b>Исполнителей</b> (можно выбрать несколько человек).</li>
                    <li>Установите <b>Приоритет</b> (Низкий, Средний, Высокий, Критичный).</li>
                    <li>Укажите <b>Дедлайн</b> (крайний срок выполнения).</li>
                  </ol>
                </div>

                {/* Realistic Mockup: Task Creation Form */}
                <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="flex justify-between items-center p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <span className="font-bold text-sm">Новая задача</span>
                      <X size={16} className="text-zinc-400" />
                    </div>
                    <div className="p-3 space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Название *</label>
                        <div className="h-9 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center px-3 text-sm text-zinc-400">
                          Подготовить ежемесячный отчет...
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Отдел *</label>
                          <div className="h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center px-3 text-sm">
                            Отдел продаж
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Приоритет</label>
                          <div className="h-9 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center px-3 text-sm gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span> Высокий
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="px-3 py-1.5 text-sm text-zinc-500 font-medium">Отмена</div>
                        <div className="px-4 py-1.5 text-sm bg-primary text-white font-medium rounded-lg shadow-sm">Создать задачу</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Editing & Checklists */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Edit2 size={24} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">3. Редактирование и Чек-листы</h2>
              </div>

              <Path steps={['Канбан-доска', 'Клик по карточке задачи', 'Иконка карандаша ✏️ (в правом верхнем углу)', 'Внесение изменений']} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed">
                  <p>
                    {activeTab === 'employee' 
                      ? 'Вы имеете право редактировать ЛЮБУЮ задачу, которая относится к вашему отделу, даже если ее создали не вы и она назначена не на вас. Задачи чужих отделов редактировать нельзя.' 
                      : 'Вы имеете право редактировать любые задачи в системе.'}
                  </p>
                  <ul className="space-y-2 mt-4">
                    <li><b>Как открыть редактор:</b> Нажмите на карточку задачи на доске, чтобы открыть ее детальный просмотр. Затем нажмите на иконку карандаша в правом верхнем углу.</li>
                    <li><b>Чек-листы:</b> Если задача объемная, разбейте ее на подзадачи. В режиме редактирования нажмите "Добавить чек-лист". Вы сможете отмечать галочками выполненные пункты, и прогресс будет виден на карточке (например, 2/5).</li>
                    <li><b>Смена исполнителя:</b> Если задача переходит к другому сотруднику, просто удалите текущего исполнителя в поле "Исполнители" и добавьте нового.</li>
                  </ul>
                </div>

                {/* Realistic Mockup: Task Card Detail */}
                <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-4 relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-1 text-xs font-bold cursor-pointer hover:bg-blue-100">
                        <Edit2 size={12} /> Редактировать
                      </div>
                      <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md"><X size={14} /></div>
                    </div>
                    
                    <div className="pr-24">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">Подготовить дизайн-макеты для лендинга</h3>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold uppercase rounded">Дизайн</span>
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-bold uppercase rounded">Высокий</span>
                      </div>
                    </div>

                    <div className="mt-5 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Этапы работы (1/3)</span>
                        <span className="text-xs text-zinc-500">33%</span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mb-3">
                        <div className="bg-primary h-1.5 rounded-full w-1/3"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-zinc-500 line-through">
                          <CheckSquare size={14} className="text-primary" /> Собрать референсы
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                          <div className="w-3.5 h-3.5 border-2 border-zinc-300 rounded-sm"></div> Отрисовать десктоп
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                          <div className="w-3.5 h-3.5 border-2 border-zinc-300 rounded-sm"></div> Отрисовать мобилку
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Changing Statuses (Drag & Drop) */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                  <GripVertical size={24} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">4. Изменение статусов (Drag & Drop)</h2>
              </div>

              <Path steps={['Канбан-доска (Мои задачи / Задачи отдела)', 'Наведение на карточку', 'Зажатие левой кнопки мыши', 'Перенос в другую колонку']} />

              <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed mb-6">
                <p>
                  Статусы задач меняются простым перетаскиванием карточек между колонками. 
                  {activeTab === 'employee' 
                    ? ' Вы можете перетаскивать ЛЮБЫЕ карточки внутри доски "Задачи отдела", даже чужие. Если вы видите задачу другого отдела (например, вас добавили туда исполнителем), вы не сможете изменить её статус — курсор превратится в запрещающий знак.' 
                    : ' Вы можете свободно перемещать любые карточки на любых досках.'}
                </p>
              </div>

              {/* Realistic Mockup: Kanban Drag & Drop */}
              <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner overflow-x-auto">
                <div className="flex gap-4 min-w-[600px]">
                  {/* Column 1 */}
                  <div className="flex-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl p-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">К выполнению</h4>
                      <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-500 text-[10px] px-1.5 rounded">0</span>
                    </div>
                    <div className="flex-1 rounded-lg border-2 border-primary/50 border-dashed bg-primary/5 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary/70">Перетащите сюда</span>
                    </div>
                  </div>

                  {/* Dragging Arrow */}
                  <div className="flex items-center justify-center text-primary animate-pulse">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </div>

                  {/* Column 2 */}
                  <div className="flex-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl p-2 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">В работе</h4>
                      <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-500 text-[10px] px-1.5 rounded">1</span>
                    </div>
                    
                    {/* Dragging Card */}
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-xl border border-primary relative z-10 transform rotate-3 scale-105 cursor-grabbing transition-transform">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">#TASK-102</span>
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-white">ИИ</div>
                      </div>
                      <h5 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-3">Настроить интеграцию с API</h5>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock size={12} /> 15 Марта
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Comments & History */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <MessageSquare size={24} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">5. Апдейты, Комментарии и История</h2>
              </div>

              <Path steps={['Клик по карточке задачи', 'Прокрутка вниз до блока "Активность"', 'Ввод текста', 'Кнопка "Отправить"']} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed">
                  <p>
                    Вся коммуникация по задаче должна вестись внутри самой задачи. Это позволяет не терять контекст и всегда видеть историю договоренностей.
                  </p>
                  <ul className="space-y-2 mt-4">
                    <li><b>Системные логи:</b> Система автоматически записывает все важные действия: кто создал задачу, кто изменил статус (например, перевел из "В работе" в "Готово"), кто изменил дедлайн. Эти записи отображаются серым цветом с иконкой робота.</li>
                    <li><b>Комментарии:</b> Вы можете писать текстовые комментарии, задавать вопросы коллегам или прикреплять ссылки на результаты работы (например, ссылку на Google Док или Figma).</li>
                    <li><b>Уведомления:</b> При добавлении комментария или изменении статуса, исполнители задачи увидят изменения в реальном времени.</li>
                  </ul>
                </div>

                {/* Realistic Mockup: Comments Section */}
                <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 flex flex-col h-[300px]">
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <span className="font-bold text-sm">Активность</span>
                    </div>
                    
                    <div className="flex-1 p-3 overflow-hidden flex flex-col gap-4">
                      {/* System Log */}
                      <div className="flex gap-3 items-start opacity-70">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                          <LayoutDashboard size={12} className="text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">Анна С.</span> изменила статус с <span className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">К выполнению</span> на <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1 rounded">В работе</span>
                          </p>
                          <span className="text-[10px] text-zinc-400">Вчера, 14:30</span>
                        </div>
                      </div>

                      {/* User Comment */}
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold border border-emerald-200">
                          АС
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">Анна Смирнова</span>
                            <span className="text-[10px] text-zinc-400">Сегодня, 10:15</span>
                          </div>
                          <div className="mt-1 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl rounded-tl-none text-sm text-zinc-800 dark:text-zinc-200">
                            Коллеги, макеты готовы. Ссылку прикрепила в описание. Перевожу задачу на ревью.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2 min-h-[40px] text-sm text-zinc-400 flex items-center">
                          Написать комментарий...
                        </div>
                        <button className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Time Tracking & Deadlines */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                  <Clock size={24} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">6. Дедлайны и Синхронизация</h2>
              </div>

              <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed mb-6">
                <p>
                  Вся работа в системе строится вокруг еженедельных циклов. Главное правило — <b>пятничная синхронизация</b>.
                </p>
                <ul className="space-y-2 mt-4">
                  <li>При создании задачи система автоматически предлагает выбрать дедлайн, выпадающий на ближайшую пятницу.</li>
                  <li>Если задача не выполнена до наступления дедлайна, она помечается как <b>просроченная</b>.</li>
                  <li>Просроченные задачи подсвечиваются красным цветом на доске и негативно влияют на статистику отдела в Дашборде.</li>
                  <li>Старайтесь переводить задачи в статус "Готово" до конца рабочей недели. Если задача переносится, обязательно измените дедлайн и оставьте комментарий с причиной переноса.</li>
                </ul>
              </div>

              {/* Realistic Mockup: Deadline Indicators */}
              <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner flex flex-col sm:flex-row gap-6 justify-center items-center">
                
                {/* Normal Task */}
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 w-full max-w-[250px]">
                  <h5 className="text-sm font-bold mb-3">Обычная задача</h5>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 w-fit px-2 py-1 rounded-md">
                    <Clock size={12} /> 20 Марта (Пт)
                  </div>
                </div>

                {/* Overdue Task */}
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-md border-2 border-red-500/50 w-full max-w-[250px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -z-10"></div>
                  <h5 className="text-sm font-bold mb-3 text-red-900 dark:text-red-100">Просроченная задача</h5>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/30 w-fit px-2 py-1 rounded-md border border-red-200 dark:border-red-800/50">
                    <Clock size={12} /> Просрочено: 13 Марта
                  </div>
                </div>

              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};
