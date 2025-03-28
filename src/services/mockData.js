// Sample bookmark data for testing
export const sampleBookmarks = {
  id: "0",
  title: "Bookmarks Bar",
  type: "folder",
  children: [
    {
      id: "1",
      title: "Development",
      type: "folder",
      children: [
        {
          id: "11",
          title: "GitHub",
          url: "https://github.com/",
          type: "bookmark"
        },
        {
          id: "12",
          title: "Stack Overflow",
          url: "https://stackoverflow.com/",
          type: "bookmark"
        },
        {
          id: "13",
          title: "MDN Web Docs",
          url: "https://developer.mozilla.org/",
          type: "bookmark"
        },
        {
          id: "14",
          title: "React Documentation",
          url: "https://reactjs.org/docs/getting-started.html",
          type: "bookmark"
        },
        {
          id: "15",
          title: "JavaScript Resources",
          type: "folder",
          children: [
            {
              id: "151",
              title: "JavaScript.info",
              url: "https://javascript.info/",
              type: "bookmark"
            },
            {
              id: "152",
              title: "ES6 Features",
              url: "https://github.com/lukehoban/es6features",
              type: "bookmark"
            }
          ]
        }
      ]
    },
    {
      id: "2",
      title: "Productivity",
      type: "folder",
      children: [
        {
          id: "21",
          title: "Trello",
          url: "https://trello.com/",
          type: "bookmark"
        },
        {
          id: "22",
          title: "Notion",
          url: "https://www.notion.so/",
          type: "bookmark"
        },
        {
          id: "23",
          title: "Google Calendar",
          url: "https://calendar.google.com/",
          type: "bookmark"
        }
      ]
    },
    {
      id: "3",
      title: "Learning",
      type: "folder",
      children: [
        {
          id: "31",
          title: "Coursera",
          url: "https://www.coursera.org/",
          type: "bookmark"
        },
        {
          id: "32",
          title: "Khan Academy",
          url: "https://www.khanacademy.org/",
          type: "bookmark"
        },
        {
          id: "33",
          title: "edX",
          url: "https://www.edx.org/",
          type: "bookmark"
        }
      ]
    },
    {
      id: "4",
      title: "News & Media",
      type: "folder",
      children: [
        {
          id: "41",
          title: "The New York Times",
          url: "https://www.nytimes.com/",
          type: "bookmark"
        },
        {
          id: "42",
          title: "BBC News",
          url: "https://www.bbc.com/news",
          type: "bookmark"
        },
        {
          id: "43",
          title: "Reuters",
          url: "https://www.reuters.com/",
          type: "bookmark"
        }
      ]
    },
    {
      id: "5",
      title: "Entertainment",
      type: "folder",
      children: [
        {
          id: "51",
          title: "YouTube",
          url: "https://www.youtube.com/",
          type: "bookmark"
        },
        {
          id: "52",
          title: "Netflix",
          url: "https://www.netflix.com/",
          type: "bookmark"
        },
        {
          id: "53",
          title: "Spotify",
          url: "https://open.spotify.com/",
          type: "bookmark"
        }
      ]
    },
    {
      id: "6",
      title: "Shopping",
      type: "folder",
      children: [
        {
          id: "61",
          title: "Amazon",
          url: "https://www.amazon.com/",
          type: "bookmark"
        },
        {
          id: "62",
          title: "eBay",
          url: "https://www.ebay.com/",
          type: "bookmark"
        },
        {
          id: "63",
          title: "Etsy",
          url: "https://www.etsy.com/",
          type: "bookmark"
        }
      ]
    },
    {
      id: "7",
      title: "Social Media",
      type: "folder",
      children: [
        {
          id: "71",
          title: "Twitter",
          url: "https://twitter.com/",
          type: "bookmark"
        },
        {
          id: "72",
          title: "LinkedIn",
          url: "https://www.linkedin.com/",
          type: "bookmark"
        },
        {
          id: "73",
          title: "Facebook",
          url: "https://www.facebook.com/",
          type: "bookmark"
        },
        {
          id: "74",
          title: "Instagram",
          url: "https://www.instagram.com/",
          type: "bookmark"
        }
      ]
    },
    {
      id: "8",
      title: "Reference",
      type: "folder",
      children: [
        {
          id: "81",
          title: "Wikipedia",
          url: "https://www.wikipedia.org/",
          type: "bookmark"
        },
        {
          id: "82",
          title: "Google Maps",
          url: "https://maps.google.com/",
          type: "bookmark"
        },
        {
          id: "83",
          title: "Dictionary.com",
          url: "https://www.dictionary.com/",
          type: "bookmark"
        }
      ]
    },
    {
      id: "9",
      title: "Favorite Sites",
      type: "folder",
      children: [
        {
          id: "91",
          title: "OpenAI",
          url: "https://openai.com/",
          type: "bookmark"
        },
        {
          id: "92",
          title: "Google",
          url: "https://www.google.com/",
          type: "bookmark"
        },
        {
          id: "93",
          title: "Medium",
          url: "https://medium.com/",
          type: "bookmark"
        }
      ]
    },
    // Add some single bookmarks outside folders
    {
      id: "101",
      title: "Weather.com",
      url: "https://weather.com/",
      type: "bookmark"
    },
    {
      id: "102",
      title: "Unsplash",
      url: "https://unsplash.com/",
      type: "bookmark"
    },
    {
      id: "103",
      title: "Product Hunt",
      url: "https://www.producthunt.com/",
      type: "bookmark"
    }
  ]
};

// Large sample for testing token limits
export const generateLargeBookmarkSample = (size = 300) => {
  const result = {
    id: "0",
    title: "Large Bookmark Collection",
    type: "folder",
    children: []
  };
  
  // Create some folders
  const numFolders = Math.min(30, Math.floor(size / 10));
  
  for (let i = 0; i < numFolders; i++) {
    const folder = {
      id: `folder-${i}`,
      title: `Folder ${i + 1}`,
      type: "folder",
      children: []
    };
    
    // Add bookmarks to folder
    const bookmarksPerFolder = Math.floor(size / numFolders);
    for (let j = 0; j < bookmarksPerFolder; j++) {
      folder.children.push({
        id: `bm-${i}-${j}`,
        title: `Bookmark ${i + 1}-${j + 1} - ${randomTitle()}`,
        url: `https://example.com/site-${i}-${j}`,
        type: "bookmark"
      });
    }
    
    result.children.push(folder);
  }
  
  return result;
};

function randomTitle() {
  const titles = [
    "How to Learn Programming", 
    "Best Cooking Recipes", 
    "Travel Destinations 2023",
    "Financial Planning Guide",
    "Top 10 Books of the Year",
    "Home Workout Routines",
    "Photography Tips for Beginners",
    "Career Advancement Strategies",
    "Gardening for Small Spaces",
    "Productivity Hacks",
    "Latest Tech Gadgets Review",
    "Healthy Meal Prep Ideas",
    "Online Learning Resources",
    "DIY Home Improvement Projects",
    "Mindfulness and Meditation"
  ];
  
  return titles[Math.floor(Math.random() * titles.length)];
} 