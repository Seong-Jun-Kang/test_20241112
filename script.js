let OPENAI_API_KEY = localStorage.getItem('openai_api_key') || '';
let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];
let mediaRecorder;
let audioChunks = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    if (OPENAI_API_KEY) {
        document.getElementById('apiKeyContainer').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'block';
        loadChatHistory();
        setupVoiceRecording();
    }
});

function setupVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                await transcribeAudio(audioBlob);
            };
        });
}

async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.text) {
            document.getElementById('userInput').value = data.text;
        }
    } catch (error) {
        console.error('Error transcribing audio:', error);
        appendMessage('system', '음성 인식 중 오류가 발생했습니다.', true);
    }
}

function startRecording() {
    audioChunks = [];
    mediaRecorder.start();
    document.getElementById('voiceButton').textContent = '녹음 중지';
    document.getElementById('voiceButton').onclick = stopRecording;
}

function stopRecording() {
    mediaRecorder.stop();
    document.getElementById('voiceButton').textContent = '음성 입력';
    document.getElementById('voiceButton').onclick = startRecording;
}

async function validateApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        showError('API Key를 입력해주세요.');
        return;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: "test"
                }],
                temperature: 0.7
            })
        });

        if (response.ok) {
            OPENAI_API_KEY = apiKey;
            // API 키를 로컬 스토리지에 저장
            localStorage.setItem('openai_api_key', apiKey);
            document.getElementById('apiKeyContainer').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'block';
        } else {
            showError('유효하지 않은 API Key입니다.');
        }
    } catch (error) {
        showError('API Key 확인 중 오류가 발생했습니다.');
    }
}

function loadChatHistory() {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = ''; // 기존 내용 초기화
    
    chatHistory.forEach(chat => {
        appendMessage(chat.sender, chat.message, false);
    });
}

async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();

    if (!message) return;

    appendMessage('user', message, true);
    userInput.value = '';

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: message
                }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        appendMessage('ai', aiResponse, true);

    } catch (error) {
        console.error('Error:', error);
        appendMessage('ai', '죄송합니다. 오류가 발생했습니다.', true);
    }
}

function appendMessage(sender, message, save = true) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (save) {
        // 대화 내역 저장
        chatHistory.push({ sender, message });
        localStorage.setItem('chat_history', JSON.stringify(chatHistory));
    }
}

// API 키 초기화 버튼 추가
function addResetButton() {
    const resetButton = document.createElement('button');
    resetButton.textContent = 'API 키 초기화';
    resetButton.onclick = function() {
        localStorage.removeItem('openai_api_key');
        localStorage.removeItem('chat_history');
        location.reload();
    };
    document.body.appendChild(resetButton);
}

// Enter 키로 메시지 전송
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 초기화 버튼 추가
addResetButton();