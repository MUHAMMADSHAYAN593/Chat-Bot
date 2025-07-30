// Static version of the app for GitHub Pages deployment
// This file allows the app to work without a backend server

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'qwen/qwen3-coder:free';

// Override the fetch call handler for GitHub Pages deployment
window.addEventListener('load', function() {
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.removeEventListener('submit', chatForm.onsubmit);
    chatForm.addEventListener('submit', handleStaticSubmit);
  }
});

async function handleStaticSubmit(e) {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  // Add user message
  addUserMessage(message);
  userInput.value = '';

  // Show loading
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'flex items-start mt-3 sm:mt-4 loading-message';
  loadingDiv.innerHTML = `
    <div class="flex-shrink-0 bg-primary-600 rounded-full p-1.5 sm:p-2">
      <i class="fas fa-robot text-white text-sm sm:text-base"></i>
    </div>
    <div class="ml-2 sm:ml-3 bg-primary-100 rounded-lg py-2 sm:py-3 px-3 sm:px-4 max-w-[75%] sm:max-w-3/4">
      <p class="text-gray-800 text-sm sm:text-base">Thinking<span class="dot-typing"></span></p>
    </div>
  `;
  
  chatContainer.querySelector('.space-y-3, .space-y-4').appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('API key is required');

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://muhammadshayan593.github.io/Chat-Bot/',
        'X-Title': 'AI Chat Assistant'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Remove loading
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) loadingMessage.remove();

    // Show AI response
    const messageContainer = createAIMessageContainer();
    await typeMessage(messageContainer, reply);
  } catch (error) {
    console.error('Error:', error);
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) loadingMessage.remove();
    
    const messageContainer = createAIMessageContainer();
    const errorMessage = error.message === 'API key is required' 
      ? 'Please provide a valid OpenRouter API key to continue.'
      : 'Sorry, there was an error processing your request. Please try again.';
    typeMessage(messageContainer, errorMessage);
  }
}

// Function to get API key from URL parameters or modal dialog
async function getApiKey() {
  // Check if API key is in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  let apiKey = urlParams.get('api_key');
  
  // If not in URL, check localStorage
  if (!apiKey) {
    apiKey = localStorage.getItem('openrouter_api_key');
  }
  
  // If still no API key, show a custom modal dialog
  if (!apiKey) {
    apiKey = await showApiKeyModal();
    
    if (apiKey) {
      // Save to localStorage for future use
      localStorage.setItem('openrouter_api_key', apiKey);
    } else {
      // User cancelled or didn't provide a key
      return null;
    }
  }
  
  return apiKey;
}

// Function to show a custom modal dialog for API key input
function showApiKeyModal() {
  return new Promise((resolve) => {
    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-lg p-6 max-w-md w-full mx-4';
    modal.innerHTML = `
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Enter OpenRouter API Key</h3>
      <p class="text-sm text-gray-600 mb-4">Your key will be stored locally in your browser and never sent to our servers.</p>
      <input type="text" id="apiKeyInput" class="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="sk-or-..."/>
      <div class="flex justify-end space-x-3">
        <button id="cancelBtn" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
        <button id="submitBtn" class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Submit</button>
      </div>
    `;
    
    // Add modal to document
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Focus the input
    const input = document.getElementById('apiKeyInput');
    input.focus();
    
    // Handle cancel button
    document.getElementById('cancelBtn').addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
      resolve(null);
    });
    
    // Handle submit button
    document.getElementById('submitBtn').addEventListener('click', () => {
      const apiKey = input.value.trim();
      document.body.removeChild(modalOverlay);
      resolve(apiKey);
    });
    
    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const apiKey = input.value.trim();
        document.body.removeChild(modalOverlay);
        resolve(apiKey);
      }
    });
  });
}

// Function to clear stored API key
function clearApiKey() {
  localStorage.removeItem('openrouter_api_key');
  alert('API key removed. Refresh the page to enter a new key.');
}

// Add a button to clear API key
function addClearKeyButton() {
  const clearButton = document.createElement('button');
  clearButton.className = 'text-xs sm:text-sm text-gray-500 underline hover:text-primary-600 ml-2';
  clearButton.textContent = 'Clear API Key';
  clearButton.addEventListener('click', clearApiKey);
  
  // Add to header on larger screens, to footer on mobile
  if (window.innerWidth > 640) {
    const header = document.querySelector('header .container');
    if (header) {
      header.appendChild(clearButton);
    } else {
      console.warn('Header container not found for Clear API Key button');
      // Try to add to body as fallback
      document.body.appendChild(clearButton);
    }
  } else {
    const footer = document.querySelector('footer .container');
    if (footer) {
      footer.appendChild(document.createElement('br'));
      footer.appendChild(clearButton);
    } else {
      console.warn('Footer container not found for Clear API Key button');
      // Try to add to body as fallback
      document.body.appendChild(clearButton);
    }
  }
}

// Override the form submission handler
async function setupStaticApp() {
  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const chatContainer = document.getElementById('chatContainer');
  
  // Get API key first
  const apiKey = await getApiKey();
  if (!apiKey) {
    const messageContainer = createAIMessageContainer();
    typeMessage(messageContainer, 'No API key provided. Please refresh the page and enter your OpenRouter API key to continue.');
    userInput.disabled = true;
    return;
  }
  
  // Add button to clear API key
  addClearKeyButton();
  
  // Override the form submission
  chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    userInput.value = '';
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'flex items-start mt-3 sm:mt-4 loading-message';
    loadingDiv.innerHTML = `
      <div class="flex-shrink-0 bg-primary-600 rounded-full p-1.5 sm:p-2">
        <i class="fas fa-robot text-white text-sm sm:text-base"></i>
      </div>
      <div class="ml-2 sm:ml-3 bg-primary-100 rounded-lg py-2 sm:py-3 px-3 sm:px-4 max-w-[75%] sm:max-w-3/4">
        <p class="text-gray-800 text-sm sm:text-base">Thinking<span class="dot-typing"></span></p>
      </div>
    `;
    
    // Try to find the messages container, with fallbacks
    const messagesContainer = chatContainer.querySelector('.space-y-3, .space-y-4') || 
                             chatContainer.querySelector('.space-y-3') || 
                             chatContainer.querySelector('.space-y-4');
    
    // If we found a container, append to it, otherwise append directly to chat container
    if (messagesContainer) {
      messagesContainer.appendChild(loadingDiv);
    } else {
      console.warn('Messages container not found, appending directly to chat container');
      chatContainer.appendChild(loadingDiv);
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    try {
      // Call OpenRouter API directly from the browser
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Coding Assistant'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      const data = await response.json();
      
      // Remove loading indicator
      const loadingMessage = document.querySelector('.loading-message');
      if (loadingMessage) {
        loadingMessage.remove();
      }
      
      if (response.ok) {
        // Create AI message container
        const messageContainer = createAIMessageContainer();
        
        // Type out the AI response with a typing effect
        const reply = data.choices[0].message.content;
        await typeMessage(messageContainer, reply);
      } else {
        // Handle API error
        const messageContainer = createAIMessageContainer();
        const errorMessage = data.error?.message || 'An error occurred while processing your request.';
        typeMessage(messageContainer, `Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error:', error);
      // Remove loading indicator
      const loadingMessage = document.querySelector('.loading-message');
      if (loadingMessage) {
        loadingMessage.remove();
      }
      // Add error message
      const messageContainer = createAIMessageContainer();
      typeMessage(messageContainer, 'Sorry, there was an error connecting to the API. Please check your internet connection and API key.');
    }
  }, { once: true }); // Replace the original event listener
}

// Initialize the static app when the page is loaded
window.addEventListener('DOMContentLoaded', setupStaticApp);