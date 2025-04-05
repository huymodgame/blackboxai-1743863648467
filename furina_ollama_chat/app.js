let currentModel = null;
let chatHistory = [];
let internetSearchEnabled = false;
let currentChatId = Date.now().toString();

// Model selection
function selectModel(model) {
    currentModel = model;
    document.getElementById('currentModel').textContent = `Model: ${model}`;
    document.getElementById('modelSelection').classList.add('hidden');
    document.getElementById('chatInterface').classList.remove('hidden');
    
    // Load chat history for this model
    loadChatHistory();
}

// Toggle internet search
document.getElementById('internetToggle').addEventListener('click', () => {
    if (navigator.onLine) {
        internetSearchEnabled = !internetSearchEnabled;
        const status = internetSearchEnabled ? 'On' : 'Off';
        document.getElementById('internetToggle').innerHTML = 
            `<i class="fas fa-wifi mr-2"></i>Internet: ${status}`;
    } else {
        alert('No internet connection available');
    }
});

// New chat
document.getElementById('newChatBtn').addEventListener('click', () => {
    currentChatId = Date.now().toString();
    chatHistory = [];
    document.getElementById('chatHistory').innerHTML = '';
});

// Send message
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function searchWeb(query) {
    if (!navigator.onLine) {
        return { error: "No internet connection available" };
    }
    
    try {
        // This is a placeholder - in a real app you would use a search API
        return { 
            results: [
                { title: "Example Result 1", url: "https://example.com/1", snippet: "This is an example search result" },
                { title: "Example Result 2", url: "https://example.com/2", snippet: "Another example search result" }
            ]
        };
    } catch (error) {
        console.error('Search error:', error);
        return { error: "Search failed" };
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessageToChat('user', message);
    input.value = '';

    try {
        // Check if internet search is enabled
        if (internetSearchEnabled) {
            const searchResults = await searchWeb(message);
            if (searchResults.error) {
                addMessageToChat('error', searchResults.error);
            } else {
                let searchSummary = "Web search results:\n";
                searchResults.results.slice(0, 3).forEach(result => {
                    searchSummary += `- ${result.title}: ${result.snippet}\n`;
                });
                addMessageToChat('search', searchSummary);
            }
        }

        // Call Ollama API
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                prompt: message,
                stream: false
            })
        });

        const data = await response.json();
        addMessageToChat('ai', data.response);

        // Save to history
        saveToHistory({
            chatId: currentChatId,
            model: currentModel,
            messages: [...chatHistory, 
                { role: 'user', content: message },
                { role: 'ai', content: data.response }
            ]
        });
    } catch (error) {
        addMessageToChat('error', 'Failed to get response from AI');
        console.error('Error:', error);
    }
}

function addMessageToChat(role, content) {
    const chatHistoryElement = document.getElementById('chatHistory');
    const messageElement = document.createElement('div');
    messageElement.className = `p-4 rounded-lg ${role === 'user' ? 'bg-blue-900 ml-auto max-w-xs md:max-w-md' : 
                                role === 'error' ? 'bg-red-900 max-w-xs md:max-w-md' : 
                                'bg-purple-900 max-w-xs md:max-w-md'}`;
    messageElement.innerHTML = content;
    chatHistoryElement.appendChild(messageElement);
    chatHistoryElement.scrollTop = chatHistoryElement.scrollHeight;
    chatHistory.push({ role, content });
}

function saveToHistory(chatData) {
    let history = JSON.parse(localStorage.getItem('ollamaChatHistory') || '[]');
    const existingIndex = history.findIndex(chat => chat.chatId === chatData.chatId);
    
    if (existingIndex >= 0) {
        history[existingIndex] = chatData;
    } else {
        history.push(chatData);
    }
    
    localStorage.setItem('ollamaChatHistory', JSON.stringify(history));
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('ollamaChatHistory') || '[]');
    const modelHistory = history.filter(chat => chat.model === currentModel);
    
    // For now just load the most recent chat
    if (modelHistory.length > 0) {
        const recentChat = modelHistory[modelHistory.length - 1];
        currentChatId = recentChat.chatId;
        chatHistory = recentChat.messages;
        
        const chatHistoryElement = document.getElementById('chatHistory');
        chatHistoryElement.innerHTML = '';
        chatHistory.forEach(msg => addMessageToChat(msg.role, msg.content));
    }
}

// Check for Ollama server on startup
async function checkOllamaServer() {
    try {
        await fetch('http://localhost:11434');
    } catch (error) {
        alert('Ollama server not running. Please run "ollama serve" first.');
    }
}

// Initialize
checkOllamaServer();