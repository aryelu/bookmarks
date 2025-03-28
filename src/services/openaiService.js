// OpenAI API integration

export const organizeBookmarksWithOpenAI = async (bookmarks, organizationType, apiKey, model = "gpt-3.5-turbo-16k", temperature = 0.7) => {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  try {
    // Prepare bookmarks data for OpenAI with preserved structure
    const bookmarksData = prepareBookmarksForAPI(bookmarks);
    
    // For large sets we'll use chunking instead of limiting
    let processedBookmarks = bookmarksData;
    const isLargeSet = countBookmarksInTree(bookmarksData) > 100;
    
    // We only need to check the size here, actual chunking is done in processLargeBookmarkCollection
    if (isLargeSet) {
      console.log(`Large bookmark set detected - this will be processed in chunks if batch processing is enabled`);
    }
    
    // Construct the prompt based on organization type
    const prompt = constructPrompt(processedBookmarks, organizationType);
    
    // Map model name to proper API model identifier if needed
    const apiModel = mapModelName(model);
    
    // Log the model being used
    console.log(`Using ${apiModel} for bookmark organization`);
    
    // Create the request body with a larger max_tokens to prevent truncation
    const requestBody = {
      model: apiModel,
      messages: [
        {
          role: "system",
          content: "You are a bookmark organization assistant. Your task is to categorize bookmarks into a logical folder structure. You must include ALL bookmarks provided without skipping any. The response must be a valid JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: temperature,
      response_format: { type: "json_object" },
      max_tokens: getMaxTokensForModel(apiModel)  // Request appropriate response size based on model
    };
    
    // Log the request configuration without the full prompt
    console.log(`Request configuration: model=${apiModel}, temperature=${temperature}, max_tokens=${getMaxTokensForModel(apiModel)}`);
    
    // Make OpenAI API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      
      let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
      
      if (errorData.error) {
        if (errorData.error.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
        
        // Handle specific error types
        if (errorData.error.code === 'context_length_exceeded') {
          throw new Error('The bookmark collection is too large for this model. Try using batch processing or a model with larger context window.');
        }
        
        if (errorData.error.type === 'tokens' || errorData.error.message.includes('token')) {
          throw new Error('Token limit exceeded. Try processing in smaller batches or using a model with larger context.');
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Get response data and parse it
    const data = await response.json();
    console.log("OpenAI API Response received");
    
    // Parse the AI response into a bookmark structure
    let parsedResponse;
    try {
      parsedResponse = parseOpenAIResponse(data.choices[0].message.content);
      
      // Validate that all bookmarks are included in the response
      const originalCount = countBookmarksInTree(bookmarks);
      const responseCount = countBookmarksInTree(parsedResponse);
      
      console.log(`Original bookmark count: ${originalCount}, Response bookmark count: ${responseCount}`);
      
      // If we're missing a significant number of bookmarks, warn about it
      if (responseCount < originalCount * 0.95) { // Allow for 5% margin of error
        console.warn(`Warning: Response contains ${responseCount} bookmarks, but original had ${originalCount}. Some bookmarks may be missing.`);
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw parseError;
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    
    // If it's already a handled error, pass it through
    if (error.message.includes('OpenAI API error') || 
        error.message.includes('API key') ||
        error.message.includes('quota') ||
        error.message.includes('Rate limit')) {
      throw error;
    }
    
    // Otherwise wrap it in a more generic message
    throw new Error(`Failed to organize bookmarks: ${error.message}`);
  }
};

// Test if the API key is valid
export const testApiKey = async (apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required');
  }
  
  try {
    // Make a minimal API call to test the key
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      if (errorData.error?.type === 'insufficient_quota') {
        throw new Error('Your OpenAI API key has insufficient quota. Please check your billing information.');
      } else if (errorData.error?.code === 'invalid_api_key') {
        throw new Error('Invalid API key. Please check that you\'ve entered your API key correctly.');
      } else if (response.status === 401) {
        throw new Error('Authentication failed. The API key appears to be invalid.');
      } else {
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }
    }
    
    // If we got here, the key is valid
    return { valid: true, message: 'API key is valid' };
  } catch (error) {
    console.error('Error testing API key:', error);
    return { 
      valid: false, 
      message: error.message || 'Failed to validate API key' 
    };
  }
};

// Prepare bookmarks data for the OpenAI API
function prepareBookmarksForAPI(bookmarks) {
  // Log the structure of bookmarks to debug
  console.log("Input bookmarks structure:", JSON.stringify(bookmarks, null, 2).substring(0, 500) + "...");
  
  // Create a simplified but hierarchical representation of bookmarks
  function processNode(node, path = '') {
    // Case 1: It's a bookmark (has URL)
    if (node.url) {
      // Extract domain from URL
      let domain = '';
      try {
        const url = new URL(node.url);
        domain = url.hostname;
      } catch (e) {
        domain = 'unknown';
      }
      
      return {
        title: node.title || "Untitled Bookmark",
        url: node.url, // Include URL for better context
        domain: domain,
        type: 'bookmark',
        path: path
      };
    } 
    // Case 2: It's a folder (has children)
    else if (node.children && node.children.length > 0) {
      const newPath = path ? `${path} > ${node.title || "Unnamed Folder"}` : (node.title || "Root");
      
      return {
        title: node.title || "Unnamed Folder",
        type: 'folder',
        path: path,
        children: node.children.map(child => processNode(child, newPath))
      };
    }
    // Case 3: Empty folder or unknown node type
    else {
      console.warn("Empty folder or unknown node structure:", node);
      
      return {
        title: node.title || "Unknown Item",
        type: node.children ? 'folder' : 'bookmark',
        path: path,
        children: []
      };
    }
  }
  
  let processedData;
  
  // Process from the root
  if (bookmarks.children) {
    // Root with children - process each child
    processedData = {
      title: bookmarks.title || "Bookmarks Root",
      type: "folder",
      children: bookmarks.children.map(child => processNode(child))
    };
  } else {
    // Single node or malformed structure
    processedData = processNode(bookmarks);
  }
  
  console.log(`Processed bookmark structure with hierarchy preserved`);
  
  return processedData;
}

// Construct a prompt based on organization type
function constructPrompt(bookmarks, organizationType) {
  // Count total bookmarks for prompt
  const totalBookmarks = countBookmarksInTree(bookmarks);
  
  if (totalBookmarks === 0) {
    console.error("No bookmarks to organize - empty structure received in constructPrompt");
    throw new Error("No bookmarks were found to organize. Please check your bookmark data structure and try again.");
  }

  let instructions = '';
  
  switch (organizationType) {
    case 'category':
      instructions = `You are a bookmark organization assistant. Your task is to categorize bookmarks into a logical, general-purpose folder structure that reflects their purpose and content.

When analyzing each bookmark:
1. Examine the URL and domain to understand the website's actual content and purpose
2. Consider the existing hierarchical structure (path) as a clue to how the user previously organized it
3. Evaluate the title to extract meaningful keywords

Organize bookmarks into meaningful, broad-purpose categories (with subfolders if needed). Group similar sites together, even if they came from different paths.

Example categories could include:
- Productivity & Planning
- Finance & Investing
- Learning & Study
- Art & Creativity
- Development & Programming
- Career & Interviews
- Crypto & Blockchain
- Shopping & Tools
- Kids & Education
- Entertainment & Media
- Personal & Admin

You may use subfolders if they improve clarity (e.g. "Art & Creativity > Videos" or "Crypto & Blockchain > NFT").

When organizing, create a logical hierarchy - for example, place all development-related sites under a "Development" folder with appropriate subfolders for languages or frameworks.

Keep all bookmark titles and URLs intact, and don't skip any.`;
      break;

    case 'alphabetical':
      instructions = `Please organize these bookmarks alphabetically, grouping them by the first letter of their title. Create a separate folder for each letter and place non-alphabetic titles in a "#" folder.

While organizing:
1. Preserve the original URLs and titles exactly
2. Use the hierarchical structure (paths) to determine if any subfolders might be useful
3. For bookmarks with similar titles, you may group them into meaningful subfolders`;
      break;

    case 'domain':
      instructions = `Based on the domains in the URLs, organize these bookmarks by website or service type. 

When organizing:
1. Group bookmarks from the same domain together
2. Create meaningful category names based on the service type (e.g., "Google Services", "Social Media", "News Sites")
3. Use the existing hierarchical structure (paths) as a hint for how to group similar domains
4. For domains with many bookmarks, create appropriate subfolders based on the URL paths or content types`;
      break;

    default:
      instructions = `Please organize these bookmarks into a logical folder structure. Use the URLs, titles, and existing paths to inform your categorization.`;
  }

  console.log(`Constructing prompt for ${totalBookmarks} bookmarks with organization type: ${organizationType}`);

  return `${instructions}

I have ${totalBookmarks} bookmarks that I need organized. Here's the complete bookmark structure with hierarchy preserved:

${JSON.stringify(bookmarks, null, 2)}

Please provide a JSON response with the following structure, including EVERY SINGLE BOOKMARK from my input, without skipping any:
{
  "type": "folder",
  "title": "Bookmarks Bar",
  "children": [
    {
      "type": "folder",
      "title": "Category Name",
      "children": [
        {
          "type": "bookmark",
          "title": "Original Bookmark Title",
          "url": "Original URL"
        }
      ]
    }
  ]
}

Guidelines:
1. Keep all original bookmark titles and URLs exactly as they appear - do not modify them
2. CRITICALLY IMPORTANT: Include ALL ${totalBookmarks} bookmarks in your response - do not skip any bookmarks, do not summarize, do not filter
3. Use descriptive category names that reflect the content
4. Create 5-15 top-level folders with appropriate subfolders where they improve organization
5. Analyze both the URL content and original folder path to derive context
6. For sites with unclear titles, examine the domain and URL path to better categorize them
7. Preserve any logical grouping from the original structure when it makes sense`;
}


// Parse the OpenAI response into a bookmark structure
function parseOpenAIResponse(responseContent) {
  try {
    // Parse the JSON response
    const parsedResponse = JSON.parse(responseContent);
    
    // Validate the structure
    if (!parsedResponse.type || parsedResponse.type !== 'folder' ||
        !parsedResponse.title || !Array.isArray(parsedResponse.children)) {
      throw new Error('Invalid response format from OpenAI');
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

// Handler for large bookmark collections
export const processLargeBookmarkCollection = async (bookmarks, organizationType, apiKey, model = "gpt-3.5-turbo-16k", temperature = 0.7) => {
  const allBookmarks = flattenBookmarks(bookmarks);
  
  // If the collection is small enough, process it normally
  if (allBookmarks.length <= 200) {
    return organizeBookmarksWithOpenAI(bookmarks, organizationType, apiKey, model, temperature);
  }
  
  // For large collections, split into smaller chunks to prevent token limits
  const chunkSize = model.includes('gpt-4') ? 150 : 200; // Use smaller chunks for GPT-4 as it uses more tokens per bookmark
  const chunks = chunkArray(allBookmarks, chunkSize);
  console.log(`Processing ${allBookmarks.length} bookmarks in ${chunks.length} chunks using ${model}`);
  
  const organizedChunks = [];
  let chunkIndex = 1;
  
  for (const chunk of chunks) {
    console.log(`Processing chunk ${chunkIndex} of ${chunks.length} (${chunk.length} bookmarks)...`);
    
    // Create a temporary bookmark structure for this chunk
    const chunkBookmarks = {
      type: 'folder',
      title: 'Temporary Chunk',
      children: chunk.map(bookmark => ({
        type: 'bookmark',
        title: bookmark.title,
        url: bookmark.url,
        domain: bookmark.domain
      }))
    };
    
    // Process this chunk
    try {
      const organizedChunk = await organizeBookmarksWithOpenAI(
        chunkBookmarks, 
        organizationType,
        apiKey,
        model,
        temperature
      );
      
      organizedChunks.push(organizedChunk);
      console.log(`Successfully processed chunk ${chunkIndex}`);
    } catch (error) {
      console.error(`Error processing chunk ${chunkIndex}:`, error);
      
      // If this chunk is still too large, split it further
      if (chunk.length > 75 && error.message.includes('too large') || error.message.includes('max tokens')) {
        console.log(`Chunk ${chunkIndex} too large, splitting further...`);
        
        const subChunks = chunkArray(chunk, chunk.length / 2);
        for (const subChunk of subChunks) {
          const subChunkBookmarks = {
            type: 'folder',
            title: 'Sub-Chunk',
            children: subChunk.map(bookmark => ({
              type: 'bookmark',
              title: bookmark.title,
              url: bookmark.url,
              domain: bookmark.domain
            }))
          };
          
          try {
            const organizedSubChunk = await organizeBookmarksWithOpenAI(
              subChunkBookmarks,
              organizationType,
              apiKey,
              model,
              temperature
            );
            
            organizedChunks.push(organizedSubChunk);
          } catch (subError) {
            console.error('Error processing sub-chunk:', subError);
            // Create a simple alphabetical organization for this chunk as fallback
            organizedChunks.push(createAlphabeticalFallback(subChunk));
          }
        }
      } else {
        // Create a simple alphabetical organization for this chunk as fallback
        organizedChunks.push(createAlphabeticalFallback(chunk));
      }
    }
    
    chunkIndex++;
  }
  
  // Merge the organized chunks
  return mergeOrganizedChunks(organizedChunks);
};

// Create a simple alphabetical organization as fallback
function createAlphabeticalFallback(bookmarks) {
  // Group bookmarks by first letter
  const groups = {};
  
  bookmarks.forEach(bookmark => {
    const firstLetter = (bookmark.title || "").charAt(0).toUpperCase();
    const group = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
    
    if (!groups[group]) {
      groups[group] = [];
    }
    
    groups[group].push({
      type: 'bookmark',
      title: bookmark.title,
      url: bookmark.url
    });
  });
  
  // Create folders for each letter group
  const children = [];
  
  Object.keys(groups).sort().forEach(letter => {
    children.push({
      type: 'folder',
      title: `${letter}`,
      children: groups[letter]
    });
  });
  
  return {
    type: 'folder',
    title: 'Alphabetical (Fallback)',
    children: children
  };
}

// Helper function to flatten bookmark hierarchy while preserving more information
function flattenBookmarks(bookmarks) {
  const flatList = [];
  
  function traverse(node, path = '') {
    if (node.url) {
      // It's a bookmark
      let domain = '';
      try {
        const url = new URL(node.url);
        domain = url.hostname;
      } catch (e) {
        domain = 'unknown';
      }
      
      flatList.push({
        title: node.title || "Untitled",
        url: node.url,
        domain: domain,
        path: path // Include the path for context
      });
    } else if (node.children) {
      // It's a folder - process children
      const newPath = path ? `${path} > ${node.title || "Unnamed Folder"}` : (node.title || "Root");
      node.children.forEach(child => traverse(child, newPath));
    }
  }
  
  if (bookmarks.children) {
    bookmarks.children.forEach(child => traverse(child, bookmarks.title || "Root"));
  } else {
    traverse(bookmarks);
  }
  
  return flatList;
}

// Split array into chunks
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Merge organized chunks into a single structure
function mergeOrganizedChunks(chunks) {
  // Start with first chunk as base
  const merged = chunks[0];
  
  // Track folders by name for easy access
  const folderMap = {};
  merged.children.forEach(folder => {
    if (folder.type === 'folder') {
      folderMap[folder.title] = folder;
    }
  });
  
  // Process remaining chunks
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    chunk.children.forEach(folder => {
      if (folder.type !== 'folder') return;
      
      if (folderMap[folder.title]) {
        // Folder exists, add bookmarks to it
        folderMap[folder.title].children.push(...folder.children);
      } else {
        // New folder, add to merged structure
        merged.children.push(folder);
        folderMap[folder.title] = folder;
      }
    });
  }
  
  return merged;
}

// Helper function to map UI model names to API model identifiers
function mapModelName(model) {
  const modelMap = {
    'gpt-3.5-turbo': 'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo-16k': 'gpt-3.5-turbo-0125',
    'gpt-4': 'gpt-4-0125-preview',
    'gpt-4-turbo': 'gpt-4-turbo-preview'
  };
  
  return modelMap[model] || 'gpt-3.5-turbo-0125';
}

// Helper function to get max_tokens parameter based on model
function getMaxTokensForModel(model) {
  // More conservative token limits to avoid errors
  if (model.includes('gpt-4-turbo')) {
    return 4000; // GPT-4 Turbo models
  } else if (model.includes('gpt-4')) {
    return 3500; // Regular GPT-4 models
  }
  return 3500; // Default for GPT-3.5 models
}

// Helper function to count bookmarks in a tree structure
function countBookmarksInTree(node) {
  if (!node) return 0;
  
  if (node.type === 'bookmark') {
    return 1;
  }
  
  if (node.children) {
    return node.children.reduce((sum, child) => sum + countBookmarksInTree(child), 0);
  }
  
  return 0;
} 