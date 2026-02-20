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
                referralCode: this.generateReferralCode(),
                lastWithdrawals: this.generateInitialWithdrawals()
            };
            this.saveUserData();
        }
    }

    generateReferralCode() {
        return 'ref_' + this.userId + '_' + Math.random().toString(36).substr(2, 6);
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
        if (startParam && startParam.startsWith('ref_')) {
            this.processReferral(startParam);
        }
    }

    processReferral(referrerCode) {
        // Проверяем, не приглашал ли уже этот пользователь
        if (localStorage.getItem(`referred_${this.userId}`)) {
            return;
        }

        // Ищем реферера в localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('user_')) {
                try {
                    const userData = JSON.parse(localStorage.getItem(key));
                    if (userData.referralCode === referrerCode) {
                        if (!userData.referrals.includes(this.userId)) {
                            userData.referrals.push(this.userId);
                            localStorage.setItem(key, JSON.stringify(userData));
                            
                            if (key === `user_${this.userId}`) {
                                this.data.referrals = userData.referrals;
                            }
                            
                            localStorage.setItem(`referred_${this.userId}`, 'true');
                            
                            setTimeout(() => {
                                this.showNotification('Вы успешно присоединились по реферальной ссылке!');
                            }, 1000);
                        }
                        break;
                    }
                } catch (e) {
                    console.log('Ошибка парсинга данных');
                }
            }
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
                const referralsCount = this.data.referrals.length;
                progressHtml = `<div class="task-progress">Приглашено: ${referralsCount}/20</div>`;
                buttonText = referralsCount >= 20 ? 'Выполнено' : 'Пригласить';
                
                if (referralsCount >= 20 && !isCompleted) {
                    this.completeTask('referral');
                }
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
                        class="task-button ${isCompleted ? 'completed' : ''}" 
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
        title: 'Пригласить 20 друзей',
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
    
    if (!task || user.data.completedTasks.includes(taskId)) {
        return;
    }
    
    if (taskId === 'referral') {
        handleReferralTask();
        return;
    }
    
    user.showNotification(`Задание выполнено! Получено +${task.reward} ₽`);
    user.completeTask(taskId);
}

function handleReferralTask() {
    // ЗАМЕНИТЕ НА USERNAME ВАШЕГО БОТА
    const botUsername = 'coolrayhgsbot'; 
    
    const referralLink = `https://t.me/${botUsername}?start=${user.data.referralCode}`;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Ваша реферальная ссылка</h2>
            <div class="referral-link">
                <a href="${referralLink}" target="_blank">${referralLink}</a>
            </div>
            <p style="color: #888; margin-top: 12px; font-size: 14px;">
                Отправьте эту ссылку друзьям. Когда они запустят бота, вы получите +1 к счетчику.
            </p>
            <button onclick="copyToClipboard('${referralLink}')" class="copy-btn">Копировать ссылку</button>
            <p style="color: #888; margin-top: 12px; font-size: 12px;">
                Текущий счетчик: ${user.data.referrals.length}/20
            </p>
        </div>
    `;
    document.body.appendChild(modal);
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