import { useState, useEffect } from 'react';
import { useBookmarkContext } from '../context/BookmarkContext';

const CategoryEditor = () => {
  const { 
    organizedBookmarks, 
    setOrganizedBookmarks,
    moveToNextStep, 
    setStatusMessage
  } = useBookmarkContext();
  
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  
  // Initialize categories from organizedBookmarks
  useEffect(() => {
    if (organizedBookmarks && organizedBookmarks.children) {
      setCategories(organizedBookmarks.children.filter(child => child.children));
      
      // Initialize all categories as expanded
      const expanded = {};
      organizedBookmarks.children.forEach(child => {
        if (child.children) {
          expanded[child.id] = true;
        }
      });
      setExpandedCategories(expanded);
    }
  }, [organizedBookmarks]);
  
  if (!organizedBookmarks) {
    return <div>No organized bookmarks to edit. Please go back and organize your bookmarks first.</div>;
  }
  
  const handleCategoryClick = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    // Create a new category with a unique ID
    const newCategory = {
      id: `category-${Date.now()}`,
      title: newCategoryName.trim(),
      children: []
    };
    
    // Update the organizedBookmarks structure
    const updatedBookmarks = {
      ...organizedBookmarks,
      children: [...organizedBookmarks.children, newCategory]
    };
    
    setOrganizedBookmarks(updatedBookmarks);
    setNewCategoryName('');
    setStatusMessage(`Added new category: ${newCategoryName.trim()}`);
  };
  
  const handleDeleteCategory = (categoryId) => {
    // Find the category to delete
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;
    
    if (!confirm(`Are you sure you want to delete the category "${categoryToDelete.title}"? Any bookmarks inside will be moved to Uncategorized.`)) {
      return;
    }
    
    // Find or create "Uncategorized" folder
    let uncategorizedFolder = organizedBookmarks.children.find(
      child => child.children && child.title === 'Uncategorized'
    );
    
    if (!uncategorizedFolder) {
      uncategorizedFolder = {
        id: `uncategorized-${Date.now()}`,
        title: 'Uncategorized',
        children: []
      };
    }
    
    // Move bookmarks from the deleted category to uncategorized
    let updatedUncategorized = {
      ...uncategorizedFolder,
      children: [
        ...uncategorizedFolder.children,
        ...(categoryToDelete.children || [])
      ]
    };
    
    // Update the organizedBookmarks structure
    const updatedBookmarks = {
      ...organizedBookmarks,
      children: organizedBookmarks.children
        .filter(child => child.id !== categoryId) // Remove the deleted category
        .map(child => child.title === 'Uncategorized' ? updatedUncategorized : child) // Update uncategorized
    };
    
    // If Uncategorized didn't exist before, add it now
    if (!organizedBookmarks.children.some(child => child.title === 'Uncategorized')) {
      updatedBookmarks.children.push(updatedUncategorized);
    }
    
    setOrganizedBookmarks(updatedBookmarks);
    setStatusMessage(`Deleted category: ${categoryToDelete.title}`);
  };
  
  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setEditCategoryName(category.title);
  };
  
  const handleSaveCategory = () => {
    if (!editCategoryName.trim() || !editingCategory) return;
    
    // Update the category name in the organizedBookmarks structure
    const updatedBookmarks = {
      ...organizedBookmarks,
      children: organizedBookmarks.children.map(child => 
        child.id === editingCategory
          ? { ...child, title: editCategoryName.trim() }
          : child
      )
    };
    
    setOrganizedBookmarks(updatedBookmarks);
    setEditingCategory(null);
    setEditCategoryName('');
    setStatusMessage('Category renamed successfully');
  };
  
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryName('');
  };
  
  const handleMoveToDifferentCategory = (bookmarkId, fromCategoryId, toCategoryId) => {
    // Find the source and destination categories
    const sourceCategory = organizedBookmarks.children.find(cat => cat.id === fromCategoryId);
    const destCategory = organizedBookmarks.children.find(cat => cat.id === toCategoryId);
    
    if (!sourceCategory || !destCategory) return;
    
    // Find the bookmark to move
    const bookmarkToMove = sourceCategory.children.find(bm => bm.id === bookmarkId);
    if (!bookmarkToMove) return;
    
    // Create updated categories
    const updatedSourceCategory = {
      ...sourceCategory,
      children: sourceCategory.children.filter(bm => bm.id !== bookmarkId)
    };
    
    const updatedDestCategory = {
      ...destCategory,
      children: [...destCategory.children, bookmarkToMove]
    };
    
    // Update the organizedBookmarks structure
    const updatedBookmarks = {
      ...organizedBookmarks,
      children: organizedBookmarks.children.map(child => {
        if (child.id === fromCategoryId) return updatedSourceCategory;
        if (child.id === toCategoryId) return updatedDestCategory;
        return child;
      })
    };
    
    setOrganizedBookmarks(updatedBookmarks);
    setStatusMessage(`Moved "${bookmarkToMove.title}" to ${destCategory.title}`);
  };
  
  const handleSaveChanges = () => {
    setStatusMessage('Categories updated successfully');
    moveToNextStep();
  };
  
  return (
    <div className="category-editor">
      <h3>Edit Categories</h3>
      <p>Reorganize your bookmarks by editing categories below before finalizing the changes.</p>
      
      <div className="add-category" style={{ marginBottom: '20px' }}>
        <h4>Add New Category</h4>
        <div style={{ display: 'flex', marginBottom: '10px' }}>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            style={{ 
              flex: '1',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
          <button 
            onClick={handleAddCategory} 
            disabled={!newCategoryName.trim()}
            style={{ marginLeft: '10px' }}
            className="btn"
          >
            Add Category
          </button>
        </div>
      </div>
      
      <div className="categories-list" style={{ 
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        marginBottom: '20px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h4 style={{ padding: '10px', borderBottom: '1px solid #e0e0e0', margin: 0 }}>
          Categories
        </h4>
        
        {categories.map(category => (
          <div key={category.id} className="category-item" style={{ 
            borderBottom: '1px solid #e0e0e0',
            padding: '10px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '5px'
            }}>
              {editingCategory === category.id ? (
                <div style={{ display: 'flex', flex: 1 }}>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    style={{ 
                      flex: '1',
                      padding: '4px',
                      fontSize: '14px',
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}
                  />
                  <button 
                    onClick={handleSaveCategory}
                    className="btn"
                    style={{ marginLeft: '5px', padding: '4px 8px', fontSize: '12px' }}
                  >
                    Save
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="btn btn-secondary"
                    style={{ marginLeft: '5px', padding: '4px 8px', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div 
                    className="category-header" 
                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <span style={{ marginRight: '5px' }}>
                      {expandedCategories[category.id] ? '▼' : '►'}
                    </span>
                    {category.title} ({category.children ? category.children.length : 0})
                  </div>
                  
                  <div>
                    <button 
                      onClick={() => handleEditCategory(category)}
                      className="btn btn-secondary"
                      style={{ marginRight: '5px', padding: '4px 8px', fontSize: '12px' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {expandedCategories[category.id] && category.children && (
              <div className="bookmarks-list" style={{ marginLeft: '20px' }}>
                {category.children.map(bookmark => (
                  <div key={bookmark.id} className="bookmark-item" style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 0',
                    fontSize: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', maxWidth: '70%' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '16px', 
                        height: '16px',
                        marginRight: '5px',
                        backgroundImage: `url(chrome://favicon/${bookmark.url})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat'
                      }}></span>
                      <span style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {bookmark.title || bookmark.url}
                      </span>
                    </div>
                    
                    <div>
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMoveToDifferentCategory(bookmark.id, category.id, e.target.value);
                            e.target.value = ''; // Reset after use
                          }
                        }}
                        style={{ fontSize: '12px', padding: '2px' }}
                      >
                        <option value="">Move to...</option>
                        {categories
                          .filter(cat => cat.id !== category.id)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.title}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                ))}
                
                {category.children.length === 0 && (
                  <div style={{ fontStyle: 'italic', fontSize: '14px', color: '#666', padding: '5px 0' }}>
                    No bookmarks in this category
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {categories.length === 0 && (
          <div style={{ padding: '10px', fontStyle: 'italic', color: '#666' }}>
            No categories found. Add some categories above.
          </div>
        )}
      </div>
      
      <button 
        onClick={handleSaveChanges} 
        className="btn"
      >
        Continue to Preview
      </button>
    </div>
  );
};

export default CategoryEditor; 