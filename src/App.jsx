import React, { useState, useEffect, useCallback } from 'react';

// Lucide React icons for a cleaner UI
import { Shuffle, Link, FileText, Copy, Settings, Lock, ListChecks } from 'lucide-react';

// --- Constants ---
// Default word list for the word chain generator
const DEFAULT_WORD_LIST = [
  "apple", "banana", "orange", "grape", "strawberry", "blueberry", "raspberry", "pineapple",
  "kiwi", "mango", "peach", "plum", "cherry", "lemon", "lime", "coconut", "avocado",
  "pear", "apricot", "fig", "date", "melon", "watermelon", "cantaloupe", "honeydew",
  "pomegranate", "guava", "papaya", "lychee", "dragonfruit", "passionfruit", "persimmon",
  "tangerine", "clementine", "nectarine", "blackberry", "cranberry", "currant", "gooseberry",
  "quince", "rhubarb", "starfruit", "ugli", "zucchini", "cucumber", "tomato", "potato",
  "carrot", "broccoli", "spinach", "kale", "lettuce", "cabbage", "onion", "garlic",
  "ginger", "pepper", "chili", "eggplant", "pumpkin", "squash", "bean", "pea", "corn",
  "rice", "wheat", "oat", "barley", "rye", "bread", "pasta", "noodle", "pizza", "burger",
  "sushi", "taco", "burrito", "sandwich", "soup", "salad", "stew", "curry", "fry", "bake",
  "roast", "grill", "steam", "boil", "simmer", "blend", "chop", "slice", "dice", "mince",
  // Expanded word list
  "forest", "mountain", "river", "ocean", "desert", "valley", "glacier", "volcano",
  "sunrise", "sunset", "moonlight", "starlight", "thunder", "lightning", "rainbow", "blizzard",
  "whisper", "giggle", "shimmer", "sparkle", "twinkle", "breeze", "melody", "harmony",
  "journey", "adventure", "explore", "discover", "wander", "travel", "expedition", "pilgrim",
  "ancient", "modern", "future", "present", "past", "timeless", "eternal", "moment",
  "brave", "courage", "heroic", "valiant", "fearless", "daring", "bold", "gallant",
  "gentle", "kindness", "compassion", "empathy", "tender", "softly", "peaceful", "calmness",
  "wisdom", "knowledge", "insight", "enlighten", "learn", "study", "thoughtful", "clever",
  "freedom", "liberty", "sovereign", "unbound", "release", "escape", "openness", "wildness",
  "mystery", "secret", "puzzle", "enigma", "riddle", "hidden", "unknown", "unseen",
  "dreamer", "imagine", "create", "invent", "design", "build", "artist", "writer",
  "speaker", "listen", "communicate", "converse", "dialogue", "express", "narrate", "recite",
  "runner", "jumper", "swimmer", "climber", "dancer", "singer", "player", "athlete",
  "garden", "flower", "tree", "plant", "bloom", "petal", "leafy", "rooting",
  "library", "bookish", "reader", "chapter", "story", "novel", "poetry", "script",
  "keyboard", "monitor", "mousepad", "speaker", "webcam", "printer", "scanner", "router",
  "cloudy", "sunny", "rainy", "windy", "snowing", "stormy", "foggy", "misty",
  "laughter", "smiling", "joyful", "happy", "blissful", "cheerful", "gleeful", "merry",
  "serene", "tranquil", "placid", "untroubled", "undisturbed", "relaxed", "composed", "stillness",
  "vibrant", "luminous", "radiant", "brilliant", "sparkling", "gleaming", "shining", "glowing",
  "whiskey", "bourbon", "scotch", "vodka", "gin", "rum", "tequila", "brandy",
  "coffee", "tea", "latte", "espresso", "cappuccino", "mocha", "chai", "matcha",
  "bicycle", "caravan", "airplane", "trains", "shipment", "rocket", "balloon", "submarine",
  "diamond", "emerald", "ruby", "sapphire", "pearl", "topaz", "amethyst", "garnet",
  "guitar", "piano", "violin", "trumpet", "drummer", "flute", "cello", "saxophone",
  "chocolate", "vanilla", "caramel", "strawberry", "minty", "cookie", "brownie", "fudge"
];

const CHAR_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/',
};

const SEPARATORS = {
  hyphen: '-',
  space: ' ',
  underscore: '_',
  none: '',
};
const SEPARATOR_OPTIONS = [
  { value: 'hyphen', label: 'Hyphen (-)' },
  { value: 'space', label: 'Space ( )' },
  { value: 'underscore', label: 'Underscore (_)' },
  { value: 'none', label: 'No Separator' },
  { value: 'random', label: 'Random Separator' },
];

// --- Utility Functions ---

/**
 * Generates a cryptographically secure random integer within a specified range.
 * @param {number} max - The exclusive upper bound for the random number (e.g., 100 for 0-99).
 * @returns {number} - A cryptographically secure random integer.
 */
const getRandomCryptoInt = (max) => {
  const randomBytes = new Uint32Array(1);
  window.crypto.getRandomValues(randomBytes);
  // Max value of a Uint32 is 2^32 - 1.
  // We need to ensure the random number is within a range that doesn't cause modulo bias.
  // This approach ensures uniform distribution.
  const randomNumber = randomBytes[0];
  const ceiling = Math.floor(0xFFFFFFFF / max) * max; // Largest multiple of 'max' that fits in Uint32
  let result = randomNumber;
  while (result >= ceiling) {
    window.crypto.getRandomValues(randomBytes);
    result = randomBytes[0];
  }
  return result % max;
};

/**
 * Copies text to the clipboard.
 * Uses document.execCommand('copy') for broader compatibility in sandboxed environments.
 * @param {string} text - The text to copy.
 * @returns {boolean} - True if copy was successful, false otherwise.
 */
const copyToClipboard = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

/**
 * Shuffles an array using the Fisher-Yates (Knuth) algorithm.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} - The shuffled array.
 */
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomCryptoInt(i + 1); // Use CSPRNG for shuffling
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Custom Checkbox component for consistent styling.
 * @param {object} props - Component props.
 * @param {string} props.id - Unique ID for the checkbox.
 * @param {string} props.label - Label text for the checkbox.
 * @param {boolean} props.checked - Current checked state.
 * @param {function} props.onChange - Callback for when the checked state changes.
 */
const Checkbox = ({ id, label, checked, onChange }) => (
  <div className="flex items-center mb-2">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-md cursor-pointer"
    />
    <label htmlFor={id} className="ml-2 text-gray-700 text-sm font-medium cursor-pointer">
      {label}
    </label>
  </div>
);

/**
 * Custom Range Slider component for consistent styling and accessibility.
 * @param {object} props - Component props.
 * @param {string} props.label - Label text for the slider.
 * @param {number} props.min - Minimum value of the slider.
 * @param {number} props.max - Maximum value of the slider.
 * @param {number} props.value - Current value of the slider.
 * @param {function} props.onChange - Callback for when the slider value changes.
 */
const RangeSlider = ({ label, min, max, value, onChange }) => (
  <div className="mb-4">
    <label htmlFor={label} className="block text-gray-700 text-sm font-medium mb-2">
      {label}: <span className="font-semibold text-indigo-600">{value}</span>
    </label>
    <input
      type="range"
      id={label}
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm accent-indigo-500"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    />
  </div>
);

// --- Components ---

/**
 * Component for the Random Password Generation mode.
 * Manages settings and logic for generating random character-based passwords.
 * @param {object} props - Component props.
 * @param {function} props.onGenerate - Callback to pass the generated password to the parent.
 */
const RandomPasswordGenerator = ({ onGenerate }) => {
  // State for password generation settings, loaded from local storage
  const [passwordLength, setPasswordLength] = useState(() => {
    const savedLength = localStorage.getItem('randomPasswordLength');
    return savedLength ? parseInt(savedLength, 10) : 16;
  });
  const [includeSymbols, setIncludeSymbols] = useState(() => {
    const saved = localStorage.getItem('includeSymbols');
    return saved ? JSON.parse(saved) : true;
  });
  const [includeNumbers, setIncludeNumbers] = useState(() => {
    const saved = localStorage.getItem('includeNumbers');
    return saved ? JSON.parse(saved) : true;
  });
  const [includeUppercase, setIncludeUppercase] = useState(() => {
    const saved = localStorage.getItem('includeUppercase');
    return saved ? JSON.parse(saved) : true;
  });
  const [includeLowercase, setIncludeLowercase] = useState(() => {
    const saved = localStorage.getItem('includeLowercase');
    return saved ? JSON.parse(saved) : true;
  });

  // Save settings to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('randomPasswordLength', passwordLength);
    localStorage.setItem('includeSymbols', includeSymbols);
    localStorage.setItem('includeNumbers', includeNumbers);
    localStorage.setItem('includeUppercase', includeUppercase);
    localStorage.setItem('includeLowercase', includeLowercase);
  }, [passwordLength, includeSymbols, includeNumbers, includeUppercase, includeLowercase]);

  /**
   * Generates a random password based on current settings.
   * Uses cryptographically secure random numbers and guarantees inclusion of selected types.
   */
  const generatePassword = useCallback(() => {
    const activeCharSets = [];
    if (includeLowercase) activeCharSets.push(CHAR_SETS.lowercase);
    if (includeUppercase) activeCharSets.push(CHAR_SETS.uppercase);
    if (includeNumbers) activeCharSets.push(CHAR_SETS.numbers);
    if (includeSymbols) activeCharSets.push(CHAR_SETS.symbols);

    // Provide feedback if no character type is selected
    if (activeCharSets.length === 0) {
      onGenerate('Please select at least one character type.');
      return;
    }

    let passwordChars = [];
    let allCharacters = activeCharSets.join('');

    // Ensure at least one character from each selected type
    activeCharSets.forEach(charSet => {
      const randomIndex = getRandomCryptoInt(charSet.length);
      passwordChars.push(charSet[randomIndex]);
    });

    // Generate the remaining characters
    for (let i = passwordChars.length; i < passwordLength; i++) {
      const randomIndex = getRandomCryptoInt(allCharacters.length);
      passwordChars.push(allCharacters[randomIndex]);
    }

    // Shuffle the array to randomize the position of the guaranteed characters
    shuffleArray(passwordChars);

    onGenerate(passwordChars.join(''));
  }, [passwordLength, includeSymbols, includeNumbers, includeUppercase, includeLowercase, onGenerate]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Shuffle className="mr-2 text-indigo-600" size={24} /> Random Generation
      </h2>

      <RangeSlider
        label="Password Length"
        min={1}
        max={64}
        value={passwordLength}
        onChange={(e) => setPasswordLength(parseInt(e.target.value, 10))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Checkbox
          id="includeLowercase"
          label="Include Lowercase Letters (a-z)"
          checked={includeLowercase}
          onChange={() => setIncludeLowercase(!includeLowercase)}
        />
        <Checkbox
          id="includeUppercase"
          label="Include Uppercase Letters (A-Z)"
          checked={includeUppercase}
          onChange={() => setIncludeUppercase(!includeUppercase)}
        />
        <Checkbox
          id="includeNumbers"
          label="Include Numbers (0-9)"
          checked={includeNumbers}
          onChange={() => setIncludeNumbers(!includeNumbers)}
        />
        <Checkbox
          id="includeSymbols"
          label="Include Symbols (!@#$%)"
          checked={includeSymbols}
          onChange={() => setIncludeSymbols(!includeSymbols)}
        />
      </div>

      <button
        onClick={generatePassword}
        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Generate Random Password
      </button>
    </div>
  );
};

/**
 * Component for the Word Chain Generation mode.
 * Manages settings and logic for generating word-based passwords.
 * @param {object} props - Component props.
 * @param {function} props.onGenerate - Callback to pass the generated password to the parent.
 */
const WordChainPasswordGenerator = ({ onGenerate }) => {
  // State for word chain generation settings
  const [wordCount, setWordCount] = useState(() => {
    const savedCount = localStorage.getItem('wordChainWordCount');
    return savedCount ? parseInt(savedCount, 10) : 4;
  });
  const [useDefaultList, setUseDefaultList] = useState(() => {
    const saved = localStorage.getItem('useDefaultWordList');
    return saved ? JSON.parse(saved) : true;
  });
  const [customWordListInput, setCustomWordListInput] = useState(() => {
    const saved = localStorage.getItem('customWordListInput');
    return saved || '';
  });
  const [customWords, setCustomWords] = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [wordListError, setWordListError] = useState(null);
  const [separatorType, setSeparatorType] = useState(() => {
    const saved = localStorage.getItem('wordChainSeparatorType');
    return saved || 'hyphen';
  });
  const [randomCapitalization, setRandomCapitalization] = useState(() => {
    const saved = localStorage.getItem('wordChainRandomCapitalization');
    return saved ? JSON.parse(saved) : false;
  });
  const [includeNumbersBetweenWords, setIncludeNumbersBetweenWords] = useState(() => {
    const saved = localStorage.getItem('wordChainIncludeNumbersBetweenWords');
    return saved ? JSON.parse(saved) : false;
  });
  const [includeSymbolsBetweenWords, setIncludeSymbolsBetweenWords] = useState(() => {
    const saved = localStorage.getItem('wordChainIncludeSymbolsBetweenWords');
    return saved ? JSON.parse(saved) : false;
  });


  // Save settings to local storage
  useEffect(() => {
    localStorage.setItem('wordChainWordCount', wordCount);
    localStorage.setItem('useDefaultWordList', useDefaultList);
    localStorage.setItem('customWordListInput', customWordListInput);
    localStorage.setItem('wordChainSeparatorType', separatorType);
    localStorage.setItem('wordChainRandomCapitalization', randomCapitalization);
    localStorage.setItem('wordChainIncludeNumbersBetweenWords', includeNumbersBetweenWords);
    localStorage.setItem('wordChainIncludeSymbolsBetweenWords', includeSymbolsBetweenWords);
  }, [wordCount, useDefaultList, customWordListInput, separatorType, randomCapitalization, includeNumbersBetweenWords, includeSymbolsBetweenWords]);

  /**
   * Processes the custom word list input, handling URLs and plain text.
   */
  const processCustomWordList = useCallback(async () => {
    setLoadingWords(true);
    setWordListError(null);
    let words = [];

    if (customWordListInput.startsWith('http://') || customWordListInput.startsWith('https://')) {
      try {
        const response = await fetch(customWordListInput);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        words = text.split(/\s+/).filter(word => word.length > 0);
      } catch (error) {
        console.error("Error fetching word list from URL:", error);
        setWordListError("Failed to load words from URL. Please check the URL and CORS policy.");
      }
    } else {
      words = customWordListInput.split(/\s+/).filter(word => word.length > 0);
    }
    setCustomWords(words);
    setLoadingWords(false);
  }, [customWordListInput]);

  // Effect to re-process custom word list when input changes
  useEffect(() => {
    if (customWordListInput) {
      processCustomWordList();
    } else {
      setCustomWords([]); // Clear custom words if input is empty
    }
  }, [customWordListInput, processCustomWordList]);

  /**
   * Applies random capitalization to a word.
   * @param {string} word - The word to capitalize.
   * @returns {string} - The capitalized word.
   */
  const applyRandomCapitalization = (word) => {
    if (!randomCapitalization) return word;

    const rand = getRandomCryptoInt(3); // 0: lowercase, 1: uppercase, 2: title case, 3: random char case
    if (rand === 0) return word.toLowerCase();
    if (rand === 1) return word.toUpperCase();
    if (rand === 2) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    // Random character case
    return word.split('').map(char => {
      return getRandomCryptoInt(2) === 0 ? char.toLowerCase() : char.toUpperCase();
    }).join('');
  };

  /**
   * Generates a word chain password based on current settings.
   */
  const generateWordChain = useCallback(() => {
    let combinedWords = [];
    if (useDefaultList) {
      combinedWords = [...DEFAULT_WORD_LIST];
    }

    if (customWords.length > 0) {
      // Use Set to ensure unique words when combining lists
      combinedWords = Array.from(new Set([...combinedWords, ...customWords]));
    }

    if (combinedWords.length === 0) {
      onGenerate('No words available. Please enable default list or provide a valid custom list.');
      return;
    }

    let generatedParts = [];
    const availableSeparators = Object.values(SEPARATORS).filter(s => s !== 'random'); // Exclude 'random' from direct use

    for (let i = 0; i < wordCount; i++) {
      // Pick a random word
      const wordIndex = getRandomCryptoInt(combinedWords.length);
      let word = combinedWords[wordIndex];

      // Apply capitalization
      word = applyRandomCapitalization(word);
      generatedParts.push(word);

      // Add separator and optional numbers/symbols if not the last word
      if (i < wordCount - 1) {
        let currentSeparator = SEPARATORS[separatorType];
        if (separatorType === 'random') {
          currentSeparator = availableSeparators[getRandomCryptoInt(availableSeparators.length)];
        }
        generatedParts.push(currentSeparator);

        if (includeNumbersBetweenWords) {
          generatedParts.push(getRandomCryptoInt(10)); // Single digit number
        }
        if (includeSymbolsBetweenWords) {
          const randomIndex = getRandomCryptoInt(CHAR_SETS.symbols.length);
          generatedParts.push(CHAR_SETS.symbols[randomIndex]);
        }
      }
    }
    onGenerate(generatedParts.join(''));
  }, [wordCount, useDefaultList, customWords, separatorType, randomCapitalization, includeNumbersBetweenWords, includeSymbolsBetweenWords, onGenerate]);

  /**
   * Handles file upload for custom word lists.
   * @param {Event} event - The file input change event.
   */
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomWordListInput(e.target.result);
        // Automatically switch to not using default list if a file is uploaded,
        // as the user is explicitly providing their own.
        setUseDefaultList(false);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <ListChecks className="mr-2 text-indigo-600" size={24} /> Word Chain Generation
      </h2>

      <RangeSlider
        label="Number of Words"
        min={1}
        max={64}
        value={wordCount}
        onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
      />

      <div className="mb-4">
        <Checkbox
          id="useDefaultList"
          label="Use Default Word List"
          checked={useDefaultList}
          onChange={() => setUseDefaultList(!useDefaultList)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="separatorType" className="block text-gray-700 text-sm font-medium mb-2">
          Separator Type:
        </label>
        <select
          id="separatorType"
          value={separatorType}
          onChange={(e) => setSeparatorType(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-800"
        >
          {SEPARATOR_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Checkbox
          id="randomCapitalization"
          label="Random Capitalization"
          checked={randomCapitalization}
          onChange={() => setRandomCapitalization(!randomCapitalization)}
        />
        <Checkbox
          id="includeNumbersBetweenWords"
          label="Include Numbers Between Words"
          checked={includeNumbersBetweenWords}
          onChange={() => setIncludeNumbersBetweenWords(!includeNumbersBetweenWords)}
        />
        <Checkbox
          id="includeSymbolsBetweenWords"
          label="Include Symbols Between Words"
          checked={includeSymbolsBetweenWords}
          onChange={() => setIncludeSymbolsBetweenWords(!includeSymbolsBetweenWords)}
        />
      </div>


      <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50 mt-4">
        <p className="text-gray-700 text-sm font-medium mb-2">
          Add Custom Words (one word per line, or space-separated, or URL):
        </p>
        <label htmlFor="customWordList" className="sr-only">Custom Word List Input</label>
        <textarea
          id="customWordList"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-800"
          rows="5"
          placeholder="Enter words here, or paste a URL (e.g., https://example.com/words.txt)"
          value={customWordListInput}
          onChange={(e) => setCustomWordListInput(e.target.value)}
        ></textarea>
        <div className="mt-2 flex items-center space-x-4">
          <label className="cursor-pointer bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-2 px-4 rounded-md transition duration-200">
            <FileText className="inline-block mr-2" size={18} />
            Upload from File
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt" />
          </label>
          <button
            onClick={processCustomWordList}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm py-2 px-4 rounded-md transition duration-200"
            disabled={loadingWords}
          >
            <Link className="inline-block mr-2" size={18} />
            {loadingWords ? 'Loading...' : 'Process Input'}
          </button>
        </div>
        {wordListError && (
          <p className="text-red-500 text-sm mt-2">{wordListError}</p>
        )}
        {customWords.length > 0 && !loadingWords && !wordListError && (
          <p className="text-green-600 text-sm mt-2">Loaded {customWords.length} custom words.</p>
        )}
        {useDefaultList && customWords.length > 0 && (
          <p className="text-blue-600 text-sm mt-2">Default words and custom words will be combined.</p>
        )}
        {!useDefaultList && customWords.length === 0 && (
          <p className="text-orange-600 text-sm mt-2">No words selected. Please enable default list or provide custom words.</p>
        )}
      </div>

      <button
        onClick={generateWordChain}
        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Generate Word Chain Password
      </button>
    </div>
  );
};

/**
 * Main App component that orchestrates the password generator.
 * Handles mode switching and displays the generated password.
 */
const App = () => {
  const [currentMode, setCurrentMode] = useState(() => {
    const savedMode = localStorage.getItem('passwordGeneratorMode');
    return savedMode || 'random'; // Default to 'random'
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  // Save current mode to local storage
  useEffect(() => {
    localStorage.setItem('passwordGeneratorMode', currentMode);
  }, [currentMode]);

  /**
   * Callback function to receive the generated password from child components.
   * @param {string} password - The generated password string.
   */
  const handleGeneratePassword = (password) => {
    setGeneratedPassword(password);
    setCopyStatus(''); // Clear copy status on new generation
  };

  /**
   * Handles copying the generated password to the clipboard.
   */
  const handleCopy = () => {
    if (copyToClipboard(generatedPassword)) {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000); // Clear after 2 seconds
    } else {
      setCopyStatus('Failed to copy.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-3xl border border-gray-200">
        <header className="bg-indigo-700 text-white p-6 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold flex items-center">
            <Lock className="mr-3" size={32} /> Password Generator
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setCurrentMode('random')}
              className={`py-2 px-5 rounded-full text-sm font-semibold transition duration-300 ease-in-out ${
                currentMode === 'random' ? 'bg-indigo-500 shadow-md' : 'bg-indigo-600 hover:bg-indigo-500'
              } flex items-center`}
            >
              <Shuffle className="mr-2" size={18} /> Random
            </button>
            <button
              onClick={() => setCurrentMode('word-chain')}
              className={`py-2 px-5 rounded-full text-sm font-semibold transition duration-300 ease-in-out ${
                currentMode === 'word-chain' ? 'bg-indigo-500 shadow-md' : 'bg-indigo-600 hover:bg-indigo-500'
              } flex items-center`}
            >
              <ListChecks className="mr-2" size={18} /> Word Chain
            </button>
          </div>
        </header>

        <main className="p-8">
          {currentMode === 'random' ? (
            <RandomPasswordGenerator onGenerate={handleGeneratePassword} />
          ) : (
            <WordChainPasswordGenerator onGenerate={handleGeneratePassword} />
          )}

          <div className="mt-8 p-6 bg-gray-100 rounded-lg border border-gray-200 shadow-inner">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Settings className="mr-2 text-indigo-600" size={20} /> Generated Password
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <input
                type="text"
                readOnly
                value={generatedPassword}
                className="flex-grow p-3 border border-gray-300 rounded-md bg-white text-gray-800 font-mono text-lg break-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your password will appear here..."
              />
              <button
                onClick={handleCopy}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-md flex items-center justify-center sm:w-auto w-full"
                disabled={!generatedPassword}
              >
                <Copy className="mr-2" size={20} /> {copyStatus || 'Copy'}
              </button>
            </div>
            {copyStatus && (
              <p className={`mt-2 text-sm ${copyStatus === 'Copied!' ? 'text-green-600' : 'text-red-500'} font-medium text-center sm:text-left`}>
                {copyStatus}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
