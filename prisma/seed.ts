import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

export const seedQuestions = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: Difficulty.EASY,
    topics: ['Arrays', 'Hash maps'],
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Output the two indices as space-separated integers in ascending order.`,
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Exactly one valid answer exists.',
    ],
    examples: [
      {
        input: '4\n2 7 11 15\n9',
        output: '0 1',
        explanation: 'Because nums[0] + nums[1] == 9, we return 0 1.',
      },
      {
        input: '3\n3 2 4\n6',
        output: '1 2',
        explanation: 'nums[1] + nums[2] == 6, so we return 1 2.',
      },
    ],
    starterCode: {
      python: `import sys

def two_sum(nums, target):
    # Write your solution here
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return sorted([seen[diff], i])
        seen[num] = i
    return []

if __name__ == '__main__':
    lines = sys.stdin.read().split()
    if lines:
        n = int(lines[0])
        nums = [int(x) for x in lines[1:n+1]]
        target = int(lines[n+1])
        res = two_sum(nums, target)
        print(f"{res[0]} {res[1]}")
`,
      javascript: `const fs = require('fs');

function twoSum(nums, target) {
  // Write your solution here
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) {
      return [seen.get(diff), i].sort((a, b) => a - b);
    }
    seen.set(nums[i], i);
  }
  return [];
}

const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 1) {
  const n = parseInt(input[0], 10);
  const nums = input.slice(1, n + 1).map(Number);
  const target = parseInt(input[n + 1], 10);
  const res = twoSum(nums, target);
  console.log(\`\${res[0]} \${res[1]}\`);
}
`,
    },
    testCases: [
      { input: '4\n2 7 11 15\n9', expectedOutput: '0 1', isHidden: false, order: 1 },
      { input: '3\n3 2 4\n6', expectedOutput: '1 2', isHidden: false, order: 2 },
      { input: '2\n3 3\n6', expectedOutput: '0 1', isHidden: true, order: 3 },
      { input: '5\n-3 4 3 90 2\n0', expectedOutput: '0 2', isHidden: true, order: 4 },
      { input: '4\n1 5 10 20\n25', expectedOutput: '1 3', isHidden: true, order: 5 },
    ],
  },
  {
    slug: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: Difficulty.EASY,
    topics: ['Strings', 'Hash maps'],
    statement: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    constraints: [
      '1 <= s.length, t.length <= 5 * 10^4',
      's and t consist of lowercase English letters.',
    ],
    examples: [
      { input: 'anagram\nnagaram', output: 'true', explanation: 'nagaram rearranges anagram.' },
      { input: 'rat\ncar', output: 'false', explanation: 'car cannot be formed from rat.' },
    ],
    starterCode: {
      python: `import sys

def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    counts = {}
    for c in s:
        counts[c] = counts.get(c, 0) + 1
    for c in t:
        if c not in counts or counts[c] == 0:
            return False
        counts[c] -= 1
    return True

if __name__ == '__main__':
    lines = sys.stdin.read().split()
    if len(lines) >= 2:
        print("true" if is_anagram(lines[0], lines[1]) else "false")
`,
      javascript: `const fs = require('fs');

function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const ch of s) count[ch] = (count[ch] || 0) + 1;
  for (const ch of t) {
    if (!count[ch]) return false;
    count[ch]--;
  }
  return true;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (lines.length >= 2) {
  console.log(isAnagram(lines[0], lines[1]) ? 'true' : 'false');
}
`,
    },
    testCases: [
      { input: 'anagram\nnagaram', expectedOutput: 'true', isHidden: false, order: 1 },
      { input: 'rat\ncar', expectedOutput: 'false', isHidden: false, order: 2 },
      { input: 'listen\nsilent', expectedOutput: 'true', isHidden: true, order: 3 },
      { input: 'a\nab', expectedOutput: 'false', isHidden: true, order: 4 },
      { input: 'abcdefg\ngfedcba', expectedOutput: 'true', isHidden: true, order: 5 },
    ],
  },
  {
    slug: 'longest-palindromic-substring',
    title: 'Longest Palindromic Substring',
    difficulty: Difficulty.MEDIUM,
    topics: ['Strings', 'Two-pointer'],
    statement: `Given a string \`s\`, return the longest palindromic substring in \`s\`.

If there are multiple answers of equal length, return the one that appears earliest.`,
    constraints: [
      '1 <= s.length <= 1000',
      's consists of only lowercase English letters.',
    ],
    examples: [
      { input: 'babad', output: 'bab', explanation: '"bab" and "aba" are both valid; "bab" appears first.' },
      { input: 'cbbd', output: 'bb', explanation: '"bb" is the longest palindromic substring.' },
    ],
    starterCode: {
      python: `import sys

def longest_palindrome(s: str) -> str:
    if not s:
        return ""
    res = ""
    for i in range(len(s)):
        # Odd length
        l, r = i, i
        while l >= 0 and r < len(s) and s[l] == s[r]:
            if (r - l + 1) > len(res):
                res = s[l:r+1]
            l -= 1
            r += 1
        # Even length
        l, r = i, i + 1
        while l >= 0 and r < len(s) and s[l] == s[r]:
            if (r - l + 1) > len(res):
                res = s[l:r+1]
            l -= 1
            r += 1
    return res

if __name__ == '__main__':
    s = sys.stdin.read().strip()
    if s:
        print(longest_palindrome(s))
`,
      javascript: `const fs = require('fs');

function longestPalindrome(s) {
  if (!s) return '';
  let res = '';
  for (let i = 0; i < s.length; i++) {
    // Odd length
    let l = i, r = i;
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      if (r - l + 1 > res.length) res = s.slice(l, r + 1);
      l--; r++;
    }
    // Even length
    l = i; r = i + 1;
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      if (r - l + 1 > res.length) res = s.slice(l, r + 1);
      l--; r++;
    }
  }
  return res;
}

const s = fs.readFileSync(0, 'utf-8').trim();
if (s) console.log(longestPalindrome(s));
`,
    },
    testCases: [
      { input: 'babad', expectedOutput: 'bab', isHidden: false, order: 1 },
      { input: 'cbbd', expectedOutput: 'bb', isHidden: false, order: 2 },
      { input: 'a', expectedOutput: 'a', isHidden: true, order: 3 },
      { input: 'racecar', expectedOutput: 'racecar', isHidden: true, order: 4 },
      { input: 'forgeeksskeegfor', expectedOutput: 'geeksskeeg', isHidden: true, order: 5 },
    ],
  },
  {
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: Difficulty.MEDIUM,
    topics: ['Arrays', 'Sorting'],
    statement: `Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

Input format: First line contains integer N (count of intervals). Next N lines each contain two integers start and end.
Output format: Each merged interval on a new line with space-separated start and end.`,
    constraints: [
      '1 <= intervals.length <= 10^4',
      '0 <= start_i <= end_i <= 10^4',
    ],
    examples: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', output: '1 6\n8 10\n15 18', explanation: '[1,3] and [2,6] overlap, merging to [1,6].' },
      { input: '2\n1 4\n4 5', output: '1 5', explanation: 'Intervals [1,4] and [4,5] overlap at boundary 4.' },
    ],
    starterCode: {
      python: `import sys

def merge(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for cur in intervals[1:]:
        prev = merged[-1]
        if cur[0] <= prev[1]:
            prev[1] = max(prev[1], cur[1])
        else:
            merged.append(cur)
    return merged

if __name__ == '__main__':
    tokens = sys.stdin.read().split()
    if tokens:
        n = int(tokens[0])
        intervals = []
        idx = 1
        for _ in range(n):
            intervals.append([int(tokens[idx]), int(tokens[idx+1])])
            idx += 2
        res = merge(intervals)
        for iv in res:
            print(f"{iv[0]} {iv[1]}")
`,
      javascript: `const fs = require('fs');

function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = intervals[i];
    if (cur[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], cur[1]);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (tokens.length > 1) {
  const n = parseInt(tokens[0], 10);
  const intervals = [];
  let idx = 1;
  for (let i = 0; i < n; i++) {
    intervals.push([parseInt(tokens[idx], 10), parseInt(tokens[idx + 1], 10)]);
    idx += 2;
  }
  const res = merge(intervals);
  for (const iv of res) {
    console.log(\`\${iv[0]} \${iv[1]}\`);
  }
}
`,
    },
    testCases: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', expectedOutput: '1 6\n8 10\n15 18', isHidden: false, order: 1 },
      { input: '2\n1 4\n4 5', expectedOutput: '1 5', isHidden: false, order: 2 },
      { input: '1\n1 10', expectedOutput: '1 10', isHidden: true, order: 3 },
      { input: '3\n1 4\n0 2\n3 5', expectedOutput: '0 5', isHidden: true, order: 4 },
      { input: '3\n2 3\n4 5\n6 7', expectedOutput: '2 3\n4 5\n6 7', isHidden: true, order: 5 },
    ],
  },
  {
    slug: 'binary-search-rotated',
    title: 'Search in Rotated Sorted Array',
    difficulty: Difficulty.MEDIUM,
    topics: ['Searching', 'Arrays'],
    statement: `Given the array \`nums\` after the possible rotation and an integer \`target\`, return the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`.

You must write an algorithm with \`O(log n)\` runtime complexity.

Input format:
Line 1: N (size of nums)
Line 2: N space-separated integers
Line 3: target integer`,
    constraints: [
      '1 <= nums.length <= 5000',
      '-10^4 <= nums[i] <= 10^4',
      'All values of nums are unique.',
      'nums is an ascending array that possibly rotated.',
    ],
    examples: [
      { input: '7\n4 5 6 7 0 1 2\n0', output: '4', explanation: 'Target 0 is found at index 4.' },
      { input: '7\n4 5 6 7 0 1 2\n3', output: '-1', explanation: 'Target 3 does not exist in nums.' },
    ],
    starterCode: {
      python: `import sys

def search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        # Left half sorted
        if nums[l] <= nums[mid]:
            if nums[l] <= target < nums[mid]:
                r = mid - 1
            else:
                l = mid + 1
        # Right half sorted
        else:
            if nums[mid] < target <= nums[r]:
                l = mid + 1
            else:
                r = mid - 1
    return -1

if __name__ == '__main__':
    tokens = sys.stdin.read().split()
    if tokens:
        n = int(tokens[0])
        nums = [int(x) for x in tokens[1:n+1]]
        target = int(tokens[n+1])
        print(search(nums, target))
`,
      javascript: `const fs = require('fs');

function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) return mid;
    if (nums[l] <= nums[mid]) {
      if (nums[l] <= target && target < nums[mid]) {
        r = mid - 1;
      } else {
        l = mid + 1;
      }
    } else {
      if (nums[mid] < target && target <= nums[r]) {
        l = mid + 1;
      } else {
        r = mid - 1;
      }
    }
  }
  return -1;
}

const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (tokens.length > 2) {
  const n = parseInt(tokens[0], 10);
  const nums = tokens.slice(1, n + 1).map(Number);
  const target = parseInt(tokens[n + 1], 10);
  console.log(search(nums, target));
}
`,
    },
    testCases: [
      { input: '7\n4 5 6 7 0 1 2\n0', expectedOutput: '4', isHidden: false, order: 1 },
      { input: '7\n4 5 6 7 0 1 2\n3', expectedOutput: '-1', isHidden: false, order: 2 },
      { input: '1\n1\n0', expectedOutput: '-1', isHidden: true, order: 3 },
      { input: '1\n1\n1', expectedOutput: '0', isHidden: true, order: 4 },
      { input: '5\n5 1 2 3 4\n1', expectedOutput: '1', isHidden: true, order: 5 },
    ],
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: Difficulty.EASY,
    topics: ['Simple dynamic programming', 'Basic recursion'],
    statement: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    constraints: ['1 <= n <= 45'],
    examples: [
      { input: '2', output: '2', explanation: 'There are two ways: 1 step + 1 step, or 2 steps.' },
      { input: '3', output: '3', explanation: 'Three ways: 1+1+1, 1+2, 2+1.' },
    ],
    starterCode: {
      python: `import sys

def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

if __name__ == '__main__':
    s = sys.stdin.read().strip()
    if s:
        print(climb_stairs(int(s)))
`,
      javascript: `const fs = require('fs');

function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

const s = fs.readFileSync(0, 'utf-8').trim();
if (s) console.log(climbStairs(parseInt(s, 10)));
`,
    },
    testCases: [
      { input: '2', expectedOutput: '2', isHidden: false, order: 1 },
      { input: '3', expectedOutput: '3', isHidden: false, order: 2 },
      { input: '1', expectedOutput: '1', isHidden: true, order: 3 },
      { input: '5', expectedOutput: '8', isHidden: true, order: 4 },
      { input: '10', expectedOutput: '89', isHidden: true, order: 5 },
    ],
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: Difficulty.EASY,
    topics: ['Stack', 'Strings'],
    statement: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print \`true\` if valid, or \`false\` otherwise.`,
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only: ()[]{}',
    ],
    examples: [
      { input: '()[]{}', output: 'true', explanation: 'All brackets are properly matched.' },
      { input: '(]', output: 'false', explanation: 'Mismatched brackets.' },
    ],
    starterCode: {
      python: `import sys

def is_valid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

if __name__ == '__main__':
    s = sys.stdin.read().strip()
    if s:
        print("true" if is_valid(s) else "false")
`,
      javascript: `const fs = require('fs');

function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const c of s) {
    if (map[c]) {
      const top = stack.length ? stack.pop() : '#';
      if (top !== map[c]) return false;
    } else {
      stack.push(c);
    }
  }
  return stack.length === 0;
}

const s = fs.readFileSync(0, 'utf-8').trim();
if (s) console.log(isValid(s) ? 'true' : 'false');
`,
    },
    testCases: [
      { input: '()[]{}', expectedOutput: 'true', isHidden: false, order: 1 },
      { input: '(]', expectedOutput: 'false', isHidden: false, order: 2 },
      { input: '([)]', expectedOutput: 'false', isHidden: true, order: 3 },
      { input: '{[]}', expectedOutput: 'true', isHidden: true, order: 4 },
      { input: '(((((((', expectedOutput: 'false', isHidden: true, order: 5 },
    ],
  },
  {
    slug: 'sliding-window-maximum',
    title: 'Sliding Window Maximum',
    difficulty: Difficulty.HARD,
    topics: ['Queue', 'Arrays'],
    statement: `You are given an array of integers \`nums\`, there is a sliding window of size \`k\` which is moving from the very left of the array to the very right. You can only see the \`k\` numbers in the window. Each time the sliding window moves right by one position.

Return the max sliding window values as space-separated integers.

Input format:
Line 1: N K
Line 2: N space-separated integers`,
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
      '1 <= k <= nums.length',
    ],
    examples: [
      {
        input: '8 3\n1 3 -1 -3 5 3 6 7',
        output: '3 3 5 5 6 7',
        explanation: 'Max in each window of size 3.',
      },
    ],
    starterCode: {
      python: `import sys
from collections import deque

def max_sliding_window(nums, k):
    q = deque()
    res = []
    for i, n in enumerate(nums):
        while q and nums[q[-1]] < n:
            q.pop()
        q.append(i)
        if q[0] <= i - k:
            q.popleft()
        if i >= k - 1:
            res.append(str(nums[q[0]]))
    return " ".join(res)

if __name__ == '__main__':
    tokens = sys.stdin.read().split()
    if tokens:
        n = int(tokens[0])
        k = int(tokens[1])
        nums = [int(x) for x in tokens[2:n+2]]
        print(max_sliding_window(nums, k))
`,
      javascript: `const fs = require('fs');

function maxSlidingWindow(nums, k) {
  const q = []; // monotonic deque storing indices
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    while (q.length && nums[q[q.length - 1]] < nums[i]) {
      q.pop();
    }
    q.push(i);
    if (q[0] <= i - k) {
      q.shift();
    }
    if (i >= k - 1) {
      res.push(nums[q[0]]);
    }
  }
  return res.join(' ');
}

const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (tokens.length >= 3) {
  const n = parseInt(tokens[0], 10);
  const k = parseInt(tokens[1], 10);
  const nums = tokens.slice(2, n + 2).map(Number);
  console.log(maxSlidingWindow(nums, k));
}
`,
    },
    testCases: [
      { input: '8 3\n1 3 -1 -3 5 3 6 7', expectedOutput: '3 3 5 5 6 7', isHidden: false, order: 1 },
      { input: '1 1\n1', expectedOutput: '1', isHidden: false, order: 2 },
      { input: '4 2\n9 11 8 5 7 10', expectedOutput: '11 11 8 7 10', isHidden: true, order: 3 },
      { input: '5 3\n1 2 3 4 5', expectedOutput: '3 4 5', isHidden: true, order: 4 },
    ],
  },
  {
    slug: 'subsets',
    title: 'Subsets (Power Set)',
    difficulty: Difficulty.MEDIUM,
    topics: ['Basic recursion', 'Arrays'],
    statement: `Given an integer array \`nums\` of unique elements, return all possible subsets (the power set).

The solution set must not contain duplicate subsets. Print each subset on a new line with space-separated numbers (or empty line for empty subset). Subsets should be sorted in lexicographical order.

Input format:
Line 1: N
Line 2: N integers`,
    constraints: [
      '1 <= nums.length <= 10',
      '-10 <= nums[i] <= 10',
      'All the numbers of nums are unique.',
    ],
    examples: [
      { input: '3\n1 2 3', output: '\n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3', explanation: 'All 8 subsets of [1,2,3].' },
    ],
    starterCode: {
      python: `import sys

def subsets(nums):
    nums.sort()
    res = []
    def backtrack(start, path):
        res.append(" ".join(map(str, path)))
        for i in range(start, len(nums)):
            backtrack(i + 1, path + [nums[i]])
    backtrack(0, [])
    return res

if __name__ == '__main__':
    tokens = sys.stdin.read().split()
    if tokens:
        n = int(tokens[0])
        nums = [int(x) for x in tokens[1:n+1]]
        for s in subsets(nums):
            print(s)
`,
      javascript: `const fs = require('fs');

function subsets(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  function backtrack(start, path) {
    res.push(path.join(' '));
    for (let i = start; i < nums.length; i++) {
      backtrack(i + 1, path.concat(nums[i]));
    }
  }
  backtrack(0, []);
  return res;
}

const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (tokens.length > 1) {
  const n = parseInt(tokens[0], 10);
  const nums = tokens.slice(1, n + 1).map(Number);
  for (const s of subsets(nums)) {
    console.log(s);
  }
}
`,
    },
    testCases: [
      { input: '3\n1 2 3', expectedOutput: '\n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3', isHidden: false, order: 1 },
      { input: '1\n0', expectedOutput: '\n0', isHidden: false, order: 2 },
      { input: '2\n4 5', expectedOutput: '\n4\n4 5\n5', isHidden: true, order: 3 },
    ],
  },
  {
    slug: 'coin-change-min',
    title: 'Coin Change',
    difficulty: Difficulty.MEDIUM,
    topics: ['Simple dynamic programming', 'Arrays'],
    statement: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

Input format:
Line 1: N amount
Line 2: N space-separated coin values`,
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4',
    ],
    examples: [
      { input: '3 11\n1 2 5', output: '3', explanation: '11 = 5 + 5 + 1 (3 coins)' },
      { input: '1 3\n2', output: '-1', explanation: 'Amount 3 cannot be made with coin 2.' },
      { input: '1 0\n1', output: '0', explanation: '0 coins needed for amount 0.' },
    ],
    starterCode: {
      python: `import sys

def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1

if __name__ == '__main__':
    tokens = sys.stdin.read().split()
    if tokens:
        n = int(tokens[0])
        amount = int(tokens[1])
        coins = [int(x) for x in tokens[2:n+2]]
        print(coin_change(coins, amount))
`,
      javascript: `const fs = require('fs');

function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (const coin of coins) {
    for (let x = coin; x <= amount; x++) {
      dp[x] = Math.min(dp[x], dp[x - coin] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (tokens.length >= 2) {
  const n = parseInt(tokens[0], 10);
  const amount = parseInt(tokens[1], 10);
  const coins = tokens.slice(2, n + 2).map(Number);
  console.log(coinChange(coins, amount));
}
`,
    },
    testCases: [
      { input: '3 11\n1 2 5', expectedOutput: '3', isHidden: false, order: 1 },
      { input: '1 3\n2', expectedOutput: '-1', isHidden: false, order: 2 },
      { input: '1 0\n1', expectedOutput: '0', isHidden: true, order: 3 },
      { input: '3 6249\n186 419 83', expectedOutput: '20', isHidden: true, order: 4 },
    ],
  },
];

export async function seedDatabase() {
  console.log('[Seed] Seeding coding questions...');

  for (const q of seedQuestions) {
    const question = await prisma.question.upsert({
      where: { slug: q.slug },
      update: {
        title: q.title,
        statement: q.statement,
        difficulty: q.difficulty,
        topics: q.topics,
        constraints: q.constraints,
        examples: q.examples,
        starterCode: q.starterCode,
      },
      create: {
        slug: q.slug,
        title: q.title,
        statement: q.statement,
        difficulty: q.difficulty,
        topics: q.topics,
        constraints: q.constraints,
        examples: q.examples,
        starterCode: q.starterCode,
      },
    });

    // Delete existing test cases to keep idempotent
    await prisma.testCase.deleteMany({
      where: { questionId: question.id },
    });

    for (const tc of q.testCases) {
      await prisma.testCase.create({
        data: {
          questionId: question.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          order: tc.order,
        },
      });
    }

    console.log(`[Seed] Seeded question: ${q.title} (${q.testCases.length} test cases)`);
  }

  console.log('[Seed] Complete! 10 questions seeded.');
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

