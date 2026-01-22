# 💰 Purchase Order "Paid" Status

## ✨ New Feature

Purchase Orders now have a **"Paid"** status to track when payments have been completed!

## 📍 Where to Find It

```
Project → Tasks → Task Details → Purchase Orders → Status Dropdown
                                                        ↓
                                          "Paid" option (NEW!)
```

## 🎯 All Purchase Order Statuses

Purchase orders now support the following statuses:

### Complete Workflow Statuses

1. **New** 🆕
   - Initial status when created
   - Not yet ordered
   - Still planning/reviewing

2. **Ordered** 📦
   - Order has been placed with vendor
   - Waiting for delivery
   - Purchase order sent

3. **Delivered** 🚚
   - Items have been received
   - Ready to install/use
   - Inventory received

4. **Paid** 💰 ⭐ **NEW!**
   - Payment has been completed
   - Invoice settled
   - Financial tracking complete

5. **Installed** ✅
   - Materials have been used/installed
   - Work completed
   - Project milestone reached

6. **Done** ✔️
   - Fully complete
   - All steps finished
   - Archive ready

7. **Declined** ❌
   - Not proceeding with this order
   - Cancelled or rejected
   - Alternative chosen

## 🔄 Typical Workflow

### Standard Flow
```
New → Ordered → Delivered → Paid → Installed → Done
```

### Example 1: Paint Purchase
```
1. New          → "Need to buy paint"
2. Ordered      → "Ordered from Home Depot"
3. Delivered    → "Paint arrived today"
4. Paid         → "Invoice paid via credit card" ⭐
5. Installed    → "Walls painted"
6. Done         → "Room complete"
```

### Example 2: Tile Order
```
1. New          → "Need 50 sqm tiles"
2. Ordered      → "Ordered from supplier"
3. Paid         → "Paid deposit upfront" ⭐
4. Delivered    → "Tiles delivered"
5. Installed    → "Bathroom tiled"
6. Done         → "Bathroom complete"
```

### Example 3: Cancelled Order
```
1. New          → "Considering luxury tiles"
2. Declined     → "Too expensive, chose alternative"
```

## 💡 When to Use "Paid"

### Use Case 1: Track Payments
```
Status: Paid ✅

Purpose: Mark that invoice has been settled
When: After payment confirmation
Who: Project owner or accountant
```

### Use Case 2: Budget Tracking
```
Material A: Paid ($500)
Material B: Paid ($300)
Material C: Ordered (not paid yet)

→ Total Paid: $800
→ Pending Payments: Material C
```

### Use Case 3: Invoice Management
```
Invoice #1234
  - Purchase Order: Paint
  - Status: Paid ✅
  - Date: 2026-01-20
  - Amount: $250

→ Easy to see what's been paid
```

### Use Case 4: Cash Flow Planning
```
THIS WEEK:
  - Material A: Delivered, needs payment
  - Material B: Paid ✅
  - Material C: Ordered, not yet delivered

NEXT WEEK:
  - Pay Material A
  - Material C expected to arrive
```

## 📊 Status Comparison

| Status | Order Placed? | Received? | Paid? | Used? | Complete? |
|--------|--------------|-----------|-------|-------|-----------|
| New | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ordered | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delivered | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Paid** ⭐ | ✅ | Varies | **✅** | ❌ | ❌ |
| Installed | ✅ | ✅ | Varies | ✅ | ❌ |
| Done | ✅ | ✅ | ✅ | ✅ | ✅ |
| Declined | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🎓 Usage Examples

### Example 1: Kitchen Renovation

**Purchase Order: Kitchen Cabinets**
```
Material: Kitchen Cabinets IKEA SEKTION
Quantity: 12
Unit: pieces
Cost: $4,500
Vendor: IKEA

Timeline:
1. New (Jan 5) → Created order
2. Ordered (Jan 7) → Order placed with IKEA
3. Paid (Jan 7) → Paid full amount via card ⭐
4. Delivered (Jan 14) → Cabinets arrived
5. Installed (Jan 20) → Cabinets installed
6. Done (Jan 21) → Kitchen complete
```

**Why "Paid" is useful:**
- Knew exactly when payment was made
- Easy to reconcile with credit card statement
- Clear financial tracking

### Example 2: Bathroom Tiles

**Purchase Order: Bathroom Tiles**
```
Material: Porcelain Tiles 30x60cm
Quantity: 50
Unit: sqm
Cost: $2,000
Vendor: Tile World

Timeline:
1. New (Jan 10) → Created order
2. Ordered (Jan 12) → Order placed
3. Delivered (Jan 18) → Tiles delivered
4. Paid (Jan 25) → Invoice paid (30-day terms) ⭐
5. Installed (Jan 30) → Bathroom tiled
6. Done (Feb 1) → Bathroom complete
```

**Why "Paid" is useful:**
- Tracked delayed payment (30-day invoice)
- Knew delivery happened before payment
- Clear separation of delivery and payment

### Example 3: Multiple Small Orders

**Weekly Paint Shop:**
```
Purchase Order 1: White Paint
Status: Paid ✅ ($150)

Purchase Order 2: Blue Paint
Status: Paid ✅ ($100)

Purchase Order 3: Primer
Status: Delivered (not yet paid)

→ Total Spent This Week: $250
→ Outstanding: Primer invoice
```

## 🔧 How to Change Status

### In the UI

1. **Navigate to Purchase Orders**
   ```
   Project → Tasks → Click Task → Purchase Orders section
   ```

2. **Find Material**
   ```
   Look in the table for the purchase order you want to update
   ```

3. **Click Status Dropdown**
   ```
   Click the status dropdown in the "Status" column
   ```

4. **Select "Paid"** ⭐
   ```
   Choose "Paid" from the dropdown
   Status updates automatically
   Toast notification confirms change
   ```

## 💾 What's Been Updated?

### Database
- ✅ Added "paid" to valid statuses in `materials` table
- ✅ Updated CHECK constraint
- ✅ Added documentation comments

### UI
- ✅ Added "Paid" option to status dropdown
- ✅ Reorganized status order for logical workflow
- ✅ All existing statuses still work

### Files Changed
- ✅ `supabase/add_paid_status_purchase_orders.sql` (new)
- ✅ `src/components/project/MaterialsList.tsx` (updated)

## 🚀 Setup (1 minute)

### Step 1: Run SQL Migration
```bash
# Supabase Dashboard → SQL Editor
# Run: supabase/add_paid_status_purchase_orders.sql
```

### Step 2: Refresh App
```bash
# Refresh browser (F5)
```

### Step 3: Test!
```
1. Go to any task with purchase orders
2. Click status dropdown
3. See "Paid" option ✅
4. Select it
5. Status updates!
```

## 🧪 Testing the Feature

### Test 1: Update to Paid
```
1. Open task with purchase order
2. Current status: "Delivered"
3. Click status dropdown
4. Select "Paid"
5. Verify: Status changes to "Paid" ✅
6. Toast notification appears
```

### Test 2: Create New Order
```
1. Create new purchase order
2. Default status: "New"
3. Change to "Ordered"
4. Change to "Delivered"
5. Change to "Paid" ⭐
6. All transitions work ✅
```

### Test 3: Complete Workflow
```
1. New → Ordered → Delivered → Paid → Installed → Done
2. Each status transition works
3. Can track full lifecycle ✅
```

## 📈 Benefits

### 1. Financial Tracking
```
✅ Know exactly what's been paid
✅ Track outstanding invoices
✅ Reconcile with bank statements
✅ Budget management
```

### 2. Clear Workflow
```
✅ Logical progression: Ordered → Delivered → Paid
✅ Separate delivery from payment
✅ Support different payment terms (30-day, COD, etc.)
```

### 3. Audit Trail
```
✅ See payment dates (via updated_at)
✅ Track who changed status
✅ Complete purchase history
```

### 4. Multi-user Coordination
```
✅ Purchaser marks "Delivered"
✅ Accountant marks "Paid"
✅ Installer marks "Installed"
✅ Clear handoffs between roles
```

## 🔍 Status Meanings Clarified

### "Paid" vs "Done"

**Paid:**
- Payment completed
- Invoice settled
- May not be installed yet

**Done:**
- Entire process complete
- Paid + Installed + Everything finished

### "Delivered" vs "Paid"

**Delivered:**
- Physical items received
- May not be paid yet (30-day invoice terms)

**Paid:**
- Invoice/payment completed
- May not be delivered yet (prepaid orders)

### "Ordered" vs "Paid"

**Ordered:**
- Order placed with vendor
- Not yet paid (usually)

**Paid:**
- Payment completed
- Order may or may not be delivered yet

## 📊 Reporting Use Cases

### 1. Total Spent
```sql
-- Get all paid purchase orders
SELECT name, cost, created_at 
FROM materials 
WHERE status = 'paid' 
  AND project_id = '...'
ORDER BY created_at DESC;

→ See everything you've paid for
```

### 2. Outstanding Payments
```sql
-- Get delivered but not paid
SELECT name, cost, vendor_name
FROM materials
WHERE status IN ('delivered', 'ordered')
  AND project_id = '...'

→ See what still needs payment
```

### 3. This Month's Expenses
```sql
-- Get paid items this month
SELECT name, cost
FROM materials
WHERE status = 'paid'
  AND updated_at >= DATE_TRUNC('month', NOW())
  AND project_id = '...'

→ Monthly spending report
```

## 🎨 UI Screenshots (Conceptual)

### Purchase Orders Table

```
┌─────────────────────────────────────────────────────────────────┐
│ Material Name  │ Qty  │ Cost    │ Vendor    │ Status     │ Edit │
├─────────────────────────────────────────────────────────────────┤
│ Paint White    │ 5 gal│ $150    │ Home Depot│ [Paid ▼]   │ ✏️   │
│ Tiles          │ 50 m²│ $2,000  │ Tile World│ [Delivered]│ ✏️   │
│ Wood Flooring  │ 30 m²│ $1,500  │ Lumber Co.│ [Ordered]  │ ✏️   │
└─────────────────────────────────────────────────────────────────┘
```

### Status Dropdown

```
┌─────────────┐
│ Status      │
├─────────────┤
│ New         │
│ Ordered     │
│ Delivered   │
│ Paid      ⭐│ ← NEW!
│ Installed   │
│ Done        │
│ Declined    │
└─────────────┘
```

## ✅ Summary

**What's New:**
- 💰 **"Paid" status** for purchase orders
- Track when payments are completed
- Better financial management
- Clear separation of delivery and payment

**How to Use:**
1. Run SQL migration (1 time)
2. Refresh app
3. Open purchase order
4. Select "Paid" from status dropdown
5. Track payments easily!

**Benefits:**
- ✅ Clear financial tracking
- ✅ Know what's paid vs outstanding
- ✅ Support different payment terms
- ✅ Better budget management
- ✅ Audit trail for payments

---

**Track your purchase order payments with ease!** 💰✅

**Setup:** Run `add_paid_status_purchase_orders.sql` and refresh! 🚀
