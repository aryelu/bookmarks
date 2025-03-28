// OpenAI API integration

export const organizeBookmarksWithOpenAI = async (bookmarks, organizationType, apiKey) => {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  try {
    // Prepare bookmarks data for OpenAI
    const bookmarksData = prepareBookmarksForAPI(bookmarks);
    
    // Construct the prompt based on organization type
    const prompt = constructPrompt(bookmarksData, organizationType);
    
    // Create the request body
    const requestBody = {
      model: "gpt-3.5-turbo-0125",
      messages: [
        {
          role: "system",
          content: "You are a bookmark organization assistant. Your task is to categorize bookmarks into a logical folder structure."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    };
    
    // Log the full request for testing in OpenAI console
    console.log("OpenAI API Request:");
    console.log("Endpoint: https://api.openai.com/v1/chat/completions");
    console.log("Headers: Content-Type: application/json, Authorization: Bearer YOUR_API_KEY");
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));
    
    // Make OpenAI API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error details:', errorData);
      
      // Handle specific error types
      if (errorData.error?.type === 'insufficient_quota') {
        throw new Error('Your OpenAI API key has insufficient quota. Please check your usage and billing information at https://platform.openai.com/account/billing');
      } else if (errorData.error?.code === 'invalid_api_key') {
        throw new Error('Invalid API key. Please check that you\'ve entered a valid OpenAI API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments');
      } else if (response.status === 401) {
        throw new Error('Authentication error. Please verify your API key is correct and active');
      } else {
        throw new Error(`OpenAI API error: ${errorData.error?.message || errorData.error?.code || response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log("OpenAI API Response:", JSON.stringify(data, null, 2));
    
    // Parse the AI response into a bookmark structure
    return parseOpenAIResponse(data.choices[0].message.content);
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
  const simplifiedBookmarks = [];
  
  // Log the structure of bookmarks to debug
  console.log("Input bookmarks structure:", JSON.stringify(bookmarks, null, 2).substring(0, 500) + "...");
  
  function extractBookmarks(node, path = '') {
    // Debug the node structure
    console.log("Processing node:", node.title || "Unnamed Node", "Has children:", !!node.children, "Has URL:", !!node.url);
    
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
      
      simplifiedBookmarks.push({
        title: node.title || "Untitled Bookmark",
        domain: domain,
        path: path
      });
    } 
    // Case 2: It's a folder (has children)
    else if (node.children) {
      const newPath = path ? `${path} > ${node.title || "Unnamed Folder"}` : (node.title || "Root");
      node.children.forEach(child => extractBookmarks(child, newPath));
    }
    // Case 3: Unknown structure - try to infer
    else {
      console.warn("Unknown node structure:", node);
      
      // Try to extract anything useful
      if (node.title) {
        simplifiedBookmarks.push({
          title: node.title,
          domain: "unknown",
          path: path
        });
      }
    }
  }
  
  // If it's the root node, process its children
  if (bookmarks.children) {
    console.log("Processing root with", bookmarks.children.length, "children");
    bookmarks.children.forEach(child => extractBookmarks(child));
  } else {
    console.log("No children in root, processing as single node");
    extractBookmarks(bookmarks);
  }
  
  // Log total number of bookmarks
  console.log(`Total bookmarks processed: ${simplifiedBookmarks.length}`);
  
  // If we still have no bookmarks, create a sample for testing
  if (simplifiedBookmarks.length === 0) {
    console.warn("No bookmarks were found in the provided structure. Creating sample data for testing.");
    
    // Attempt to find any URLs in the structure
    const flattenedJSON = JSON.stringify(bookmarks);
    const urlMatches = flattenedJSON.match(/https?:\/\/[^\s"]+/g) || [];
    
    if (urlMatches.length > 0) {
      console.log("Found", urlMatches.length, "URLs in the structure");
      urlMatches.forEach(url => {
        simplifiedBookmarks.push({
          title: "Extracted Bookmark",
          domain: new URL(url).hostname,
          path: "Extracted"
        });
      });
    } else {
      // Add sample data
      simplifiedBookmarks.push(
        { title: "Sample Bookmark 1", domain: "example.com", path: "Samples" },
        { title: "Sample Bookmark 2", domain: "example.org", path: "Samples" }
      );
    }
  }
  
  return simplifiedBookmarks;
}

// Construct a prompt based on organization type
function constructPrompt(bookmarks, organizationType) {
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    console.error("No bookmarks to organize - empty array received in constructPrompt");
    throw new Error("No bookmarks were found to organize. Please check your bookmark data structure and try again.");
  }

  let instructions = '';
  
  switch (organizationType) {
    case 'category':
      instructions = `You are a bookmark organization assistant. Your task is to categorize bookmarks into a logical, general-purpose folder structure that reflects their purpose and content — **not the original bookmark path**.

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

You may use subfolders if they improve clarity (e.g. “Art & Creativity > Videos” or “Crypto & Blockchain > NFT”).

Do not preserve original folder names like “Refs” or “Projects” unless they directly match a general-purpose category.

Keep all bookmark titles and URLs intact, and don’t skip any.`;
      break;

    case 'alphabetical':
      instructions = `Please organize these bookmarks alphabetically, grouping them by the first letter of their title. Create a separate folder for each letter and place non-alphabetic titles in a "#" folder.`;
      break;

    case 'frequency':
      instructions = `Based on the bookmark paths and domains, organize these bookmarks into "Frequently Used", "Sometimes Used", and "Rarely Used" categories. Use your best judgment about which sites are likely used most frequently.`;
      break;

    default:
      instructions = `Please organize these bookmarks into a logical folder structure.`;
  }

  console.log(`Constructing prompt for ${bookmarks.length} bookmarks with organization type: ${organizationType}`);

  return `${instructions}

I have ${bookmarks.length} bookmarks that I need organized. Here's the full list of them:

${JSON.stringify(bookmarks, null, 2)}

Please provide a JSON response with the following structure:
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
1. Keep all original bookmark titles and URLs intact.
2. Don’t lose any bookmarks.
3. Use descriptive category names.
4. Create only 5–15 top-level folders unless subfolders improve organization.
5. Group by purpose and content — not original path.`;
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
export const processLargeBookmarkCollection = async (bookmarks, organizationType, apiKey) => {
  const allBookmarks = flattenBookmarks(bookmarks);
  
  // If the collection is small enough, process it normally
  if (allBookmarks.length <= 300) {
    return organizeBookmarksWithOpenAI(bookmarks, organizationType, apiKey);
  }
  
  // For large collections, split into chunks and process separately
  const chunks = chunkArray(allBookmarks, 250);
  console.log(`Processing ${allBookmarks.length} bookmarks in ${chunks.length} chunks`);
  
  const organizedChunks = [];
  let chunkIndex = 1;
  
  for (const chunk of chunks) {
    console.log(`Processing chunk ${chunkIndex} of ${chunks.length}...`);
    
    // Create a temporary bookmark structure for this chunk
    const chunkBookmarks = {
      type: 'folder',
      title: 'Temporary Chunk',
      children: chunk.map(bookmark => ({
        type: 'bookmark',
        title: bookmark.title,
        url: bookmark.url
      }))
    };
    
    // Process this chunk
    const organizedChunk = await organizeBookmarksWithOpenAI(
      chunkBookmarks, 
      organizationType,
      apiKey
    );
    
    organizedChunks.push(organizedChunk);
    chunkIndex++;
  }
  
  // Merge the organized chunks
  return mergeOrganizedChunks(organizedChunks);
};

// Helper function to flatten bookmark hierarchy
function flattenBookmarks(bookmarks) {
  const flatList = [];
  
  function traverse(node) {
    if (node.type === 'bookmark') {
      flatList.push({
        title: node.title,
        url: node.url
      });
    } else if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(bookmarks);
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