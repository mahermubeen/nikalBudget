# Budget Nikal - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from modern fintech applications (Mint, YNAB) combined with productivity tools (Linear, Notion) for clean data-heavy interfaces. Focus on clarity, efficiency, and mobile-first interactions.

**Core Principles**:
- Information hierarchy that prioritizes critical financial data
- Scannable layouts with clear visual groupings
- Touch-friendly interactions optimized for mobile
- Trustworthy, professional aesthetic appropriate for financial management

---

## Typography

**Font Stack**: Inter (primary), SF Pro Display (headings fallback)
- **Headings**: 
  - H1: 2.5rem (40px) / font-bold / leading-tight - Page titles
  - H2: 1.875rem (30px) / font-semibold / leading-snug - Section headers
  - H3: 1.5rem (24px) / font-semibold / leading-snug - Card headers
  - H4: 1.25rem (20px) / font-medium / leading-normal - Subsection titles
  
- **Body Text**:
  - Large: 1.125rem (18px) / font-normal / leading-relaxed - Primary content
  - Base: 1rem (16px) / font-normal / leading-normal - Standard text
  - Small: 0.875rem (14px) / font-normal / leading-normal - Secondary info
  
- **Specialized**:
  - Numbers/Currency: font-mono / font-semibold - All financial amounts
  - Labels: 0.75rem (12px) / font-medium / uppercase / tracking-wide - Form labels, status badges
  - Buttons: 1rem (16px) / font-semibold / leading-none

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16, 20**
- Micro spacing: p-2, m-2 (8px) - Between related elements
- Standard spacing: p-4, m-4 (16px) - Card padding, form field gaps
- Section spacing: p-6, m-6 (24px) - Between sections on mobile
- Large spacing: p-8, m-8 (32px) - Desktop section padding
- Extra large: p-12, p-16, p-20 (48-80px) - Hero sections, major separators

**Grid System**:
- Mobile (base): Single column, full-width stacking
- Tablet (md:): 2-column grid for KPI cards, form pairs
- Desktop (lg:): 3-4 column grid for dashboard metrics, up to 2 columns for forms

**Container Widths**:
- Mobile: Full width with px-4 padding
- Dashboard sections: max-w-6xl mx-auto
- Form containers: max-w-2xl mx-auto
- Reading content: max-w-prose

---

## Component Library

### Navigation
**Header/App Bar**:
- Fixed top position on mobile, sticky on desktop
- Height: h-16 (64px) for adequate touch target
- Contains: Logo (left), Month switcher (center), User menu (right)
- Month switcher: Inline with left/right chevron buttons, current month display (e.g., "October 2025")
- Box shadow for depth separation

**Tab Navigation** (for main sections):
- Full-width tabs on mobile, inline tabs on desktop
- Height: h-12 (48px) minimum for touch
- Active indicator: Bottom border (4px thick)
- Icons + labels on desktop, icons only on mobile to save space

### Dashboard Cards

**KPI Metric Cards**:
- Grid layout: 1 column mobile, 2 columns tablet, 4 columns desktop
- Card structure: p-6 padding, rounded-lg borders
- Layout within card:
  - Label: Small uppercase text (0.75rem)
  - Amount: Extra large mono font (2rem on mobile, 2.5rem on desktop)
  - Subtext: Small text for context (e.g., "5 items pending")
- Minimum height: h-32 for consistency
- Box shadow: Subtle elevation

**Income/Expense List Cards**:
- Each item in list:
  - Horizontal layout: Checkbox/toggle (left), Label & details (center), Amount (right)
  - Height: min-h-16 for touch targets
  - Padding: p-4
  - Border-bottom separator between items
- Item details stack vertically on very small screens (<375px)
- Status badge: Small pill shape, uppercase text
- Paid date: Small secondary text below label when marked done

**Credit Card Statement Cards**:
- Card header: Card nickname (H3), issuer info (small text)
- Statement info grid: 2 columns on mobile (Statement/Due dates, Total/Minimum due)
- Available limit: Prominent display with progress indicator
- Status toggle: Large button at bottom
- Spacing: p-6 card padding, gap-4 between elements

### Forms

**Input Fields**:
- Height: h-12 (48px) minimum for mobile touch
- Padding: px-4 py-3
- Border: 2px width for clarity
- Border radius: rounded-lg
- Label: Above input, small text with medium weight
- Stack vertically on mobile, 2-column grid on desktop where appropriate

**Currency/Amount Inputs**:
- Monospace font for alignment
- Currency symbol prefix (non-editable, visually integrated)
- Right-aligned text for numbers
- Thousands separator display

**Toggle Switches** (Status: Pending/Done):
- Large toggle: w-14 h-8 minimum
- Clear on/off states with labels
- Immediate visual feedback

**Buttons**:
- Primary: h-12 minimum, px-8 padding, rounded-lg, font-semibold
- Secondary: Same sizing, outlined variant
- Icon buttons: w-12 h-12 square for navigation arrows
- Full-width on mobile for primary actions, inline on desktop

**Sliders** (Cash-out planner):
- Track height: h-3
- Thumb size: w-6 h-6 (large touch target)
- Value display above slider (currency amount)
- Min/max labels at ends

### Data Display

**Month Switcher**:
- Centered horizontal layout
- Previous button (left arrow), Month/Year display (center), Next button (right arrow)
- Button size: w-10 h-10 minimum
- Month display: H3 font size, medium weight

**Status Badges**:
- Pill shape: px-3 py-1, rounded-full
- Uppercase text: 0.75rem, font-medium, tracking-wide
- Variants: "PENDING", "DONE", "RECURRING"

**Summary Sections**:
- Clear visual hierarchy with headers
- Total amounts prominently displayed
- Breakdown lists with indentation for subcategories
- Use of horizontal rules (border-t) to separate logical groups

### Modals/Overlays

**Add/Edit Forms**:
- Full-screen modal on mobile, centered overlay (max-w-2xl) on desktop
- Close button: top-right, w-10 h-10 minimum
- Form content: p-6 padding
- Footer with action buttons: sticky bottom, full-width primary button

**Cash-out Planner Modal**:
- Two-step layout: Card selection/sliders (top), Summary/validation (bottom)
- Each card option: Card display with available limit, slider for withdrawal amount
- Real-time calculation display for cushion
- Validation messages: Inline below problematic fields
- Apply button: Disabled state when validation fails

---

## Page Layouts

### Overview/Dashboard
- Hero KPI section: 4 metric cards (Income, Cards Total, Non-Card Expenses, After Cards, Need)
- Below KPIs: Tabbed sections for Income, Expenses, Credit Cards
- Each tab reveals corresponding list/cards
- Sticky add button: Bottom-right FAB on mobile, top-right on desktop

### Card Management
- List of all credit cards: Card-based layout
- Each card shows: Nickname, current month statement summary
- Tap/click card to expand full statement details
- Add new card: Prominent button at top

### Monthly Budget Plan
- Month switcher at top
- KPI summary cards
- Three collapsible sections: Income, Expenses (with cards/loans separated), Card Statements
- Each section header shows count and total
- Quick-add buttons within each section

### Cash-out Planner
- Opened from dashboard "Plan Cash-out" button
- Step 1: Display current financial summary (income, cards, expenses, calculated need)
- Step 2: Card selection with sliders
- Step 3: Review and apply (creates expenses)

### Settings
- Simple form layout: max-w-2xl centered
- Currency selector: Searchable dropdown with country flags
- Account settings: Username/email display, password change
- Footer always visible

---

## Responsive Behavior

**Mobile (< 768px)**:
- Single column layouts
- Full-width buttons
- Sticky headers/footers
- Bottom sheet for modals
- Stack all KPI cards vertically
- Hide secondary information, show on expand

**Tablet (768px - 1024px)**:
- 2-column grids for metrics
- Side-by-side forms where logical
- Inline navigation tabs

**Desktop (> 1024px)**:
- 3-4 column dashboard grids
- Centered modals with max-width
- Persistent sidebar navigation (optional enhancement)
- Hover states for interactive elements

---

## Animations

**Minimal, purposeful animations only**:
- Status toggle: 200ms ease transition
- Modal enter/exit: 150ms fade + slide
- Card expand/collapse: 200ms height transition
- Button press: Scale down to 0.98 (50ms)
- No scroll animations, no decorative motion

---

## Footer

**Fixed footer on all pages**:
- Text: "A product by DEVPOOL."
- Center-aligned, small text (0.875rem)
- Padding: py-4
- Border-top separator
- Always visible at bottom of content (not fixed to viewport)

---

## Images

**No hero images required** for this utility-focused application. The dashboard is data-first with KPI cards serving as the primary visual anchor. All emphasis on clarity of information over decorative imagery.