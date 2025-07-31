// Configuration
const API_URL = 'http://localhost:3000/api/chat'; // Change this to your deployed backend URL

// Initialize conversation history
let conversationHistory = [];

// Helper functions
function escapeHtml(unsafe) {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCodeBlocks(text) {
  if (!text || typeof text !== 'string') return '';
  
  try {
    const codeBlockRegex = /```([a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
    let formattedText = text;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const language = match[1] || '';
      const code = match[2].trim();
      const formattedCode = `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
      formattedText = formattedText.replace(match[0], formattedCode);
    }
    
    const inlineCodeRegex = /`([^`]+)`/g;
    formattedText = formattedText.replace(inlineCodeRegex, '<code class="inline-code">$1</code>');
    
    return formattedText;
  } catch (error) {
    console.error('Error formatting code blocks:', error);
    return escapeHtml(text);
  }
}

function createLoadingIndicator() {
  const div = document.createElement('div');
  div.className = 'flex items-start mt-3 sm:mt-4 loading-message';
  div.innerHTML = `
    <div class="flex-shrink-0 bg-primary-600 rounded-full p-1.5 sm:p-2">
      <i class="fas fa-robot text-white text-sm sm:text-base"></i>
    </div>
    <div class="ml-2 sm:ml-3 bg-primary-100 rounded-lg py-2 sm:py-3 px-3 sm:px-4 max-w-[75%] sm:max-w-3/4">
      <p class="text-gray-800 text-sm sm:text-base">Thinking<span class="dot-typing"></span></p>
    </div>
  `;
  return div;
}

function addUserMessage(content) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'flex items-start mt-3 sm:mt-4';
  messageDiv.innerHTML = `
    <div class="flex-shrink-0 bg-gray-300 rounded-full p-1.5 sm:p-2">
      <i class="fas fa-user text-white text-sm sm:text-base"></i>
    </div>
    <div class="ml-2 sm:ml-3 bg-white border border-gray-200 rounded-lg py-2 sm:py-3 px-3 sm:px-4 max-w-[75%] sm:max-w-3/4">
      <p class="text-gray-800 text-sm sm:text-base">${escapeHtml(content)}</p>
    </div>
  `;
  
  const messagesContainer = chatContainer.querySelector('.space-y-3, .space-y-4');
  if (messagesContainer) {
    messagesContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function createAIMessageContainer() {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return null;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'flex items-start mt-3 sm:mt-4';
  messageDiv.innerHTML = `
    <div class="flex-shrink-0 bg-primary-600 rounded-full p-1.5 sm:p-2">
      <i class="fas fa-robot text-white text-sm sm:text-base"></i>
    </div>
    <div class="ml-2 sm:ml-3 bg-primary-100 rounded-lg py-2 sm:py-3 px-3 sm:px-4 max-w-[75%] sm:max-w-3/4">
      <div class="text-gray-800 message-content text-sm sm:text-base"></div>
    </div>
  `;
  const messagesContainer = chatContainer.querySelector('.space-y-3, .space-y-4');
  if (messagesContainer) {
    messagesContainer.appendChild(messageDiv);
  }
  return messageDiv.querySelector('.message-content');
}

async function typeMessage(container, message) {
  if (!container || !message) return;
  message = String(message);
  
  try {
    const formattedMessage = formatCodeBlocks(message);
    if (formattedMessage.includes('<pre>') || formattedMessage.includes('<code>')) {
      container.innerHTML = formattedMessage;
      if (window.hljs) {
        container.querySelectorAll('pre code').forEach(block => {
          window.hljs.highlightElement(block);
        });
      }
    } else {
      let i = 0;
      const interval = setInterval(() => {
        if (i < message.length) {
          container.textContent += message.charAt(i);
          i++;
          container.parentElement.parentElement.parentElement.scrollTop = 
            container.parentElement.parentElement.parentElement.scrollHeight;
        } else {
          clearInterval(interval);
        }
      }, 10);
    }
  } catch (error) {
    console.error('Error in typeMessage:', error);
    container.textContent = message;
  }
}

async function handleChat(message) {
  if (!message) return;

  let loadingDiv;
  
  try {
    addUserMessage(message);
    
    loadingDiv = createLoadingIndicator();
    const chatContainer = document.getElementById('chatContainer');
    const messagesContainer = chatContainer.querySelector('.space-y-3, .space-y-4');
    if (!messagesContainer) {
      console.error('Messages container not found');
      return;
    }
    
    messagesContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    loadingDiv.remove();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    const reply = data.reply;
    if (!reply) throw new Error('Invalid response from API');

    conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );
    
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    const messageContainer = createAIMessageContainer();
    await typeMessage(messageContainer, reply);
  } catch (error) {
    console.error('Error:', error);
    if (loadingDiv) {
      loadingDiv.remove();
    }
    
    const messageContainer = createAIMessageContainer();
    await typeMessage(messageContainer, 'Sorry, there was an error. Please try again.');
  }
}

// Initialize chat when the page loads
document.addEventListener('DOMContentLoaded', function() {
  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const chatContainer = document.getElementById('chatContainer');

  if (!chatForm || !userInput || !chatContainer) {
    console.error('Required elements not found');
    return;
  }

  // Remove any existing event listeners
  const newChatForm = chatForm.cloneNode(true);
  chatForm.parentNode.replaceChild(newChatForm, chatForm);
  
  // Ensure we have the messages container
  let messagesContainer = chatContainer.querySelector('.space-y-3, .space-y-4');
  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'space-y-3';
    chatContainer.appendChild(messagesContainer);
  }

  // Clear any existing messages
  messagesContainer.innerHTML = `
    <div class="flex items-start">
      <div class="flex-shrink-0 bg-primary-600 rounded-full p-1.5 sm:p-2">
        <i class="fas fa-robot text-white text-sm sm:text-base"></i>
      </div>
      <div class="ml-2 sm:ml-3 bg-primary-100 rounded-lg py-2 sm:py-3 px-3 sm:px-4 max-w-[75%] sm:max-w-3/4">
        <p class="text-gray-800 text-sm sm:text-base">Hello! I'm your AI assistant. How can I help you today?</p>
      </div>
    </div>
  `;

  newChatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (message) {
      input.value = '';
      handleChat(message);
    }
  });

  userInput.focus();
});
