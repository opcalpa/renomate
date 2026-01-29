import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Loader2,
  CheckCircle,
  Package,
  X,
  Filter
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface BudgetDashboardProps {
  projectId: string;
  totalBudget: number | null;
  spentAmount: number | null;
}

const BudgetDashboard = ({ projectId, totalBudget, spentAmount }: BudgetDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [ongoingCostsTotal, setOngoingCostsTotal] = useState(0);
  const [ongoingCostsCount, setOngoingCostsCount] = useState(0);
  const [paymentsDialogOpen, setPaymentsDialogOpen] = useState(false);
  const [ongoingCostsDialogOpen, setOngoingCostsDialogOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [ongoingCosts, setOngoingCosts] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [filteredOngoingCosts, setFilteredOngoingCosts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [ongoingFilterType, setOngoingFilterType] = useState<string>("all");
  const [ongoingFilterDate, setOngoingFilterDate] = useState<string>("");
  const [pieChartView, setPieChartView] = useState<string>("budget");
  const [costByRoom, setCostByRoom] = useState<any[]>([]);
  const [costByCostCenter, setCostByCostCenter] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      // Get tasks with budget (considered as paid)
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          budget,
          created_at,
          updated_at
        `)
        .eq("project_id", projectId)
        .not("budget", "is", null)
        .gt("budget", 0);

      if (tasksError) throw tasksError;

      // Get all purchase orders (exclude_from_budget = false)
      // This matches how spentAmount is calculated in OverviewTab
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select(`
          id,
          name,
          price_total,
          status,
          exclude_from_budget,
          created_at,
          updated_at
        `)
        .eq("project_id", projectId)
        .eq("exclude_from_budget", false);

      if (materialsError) throw materialsError;

      // Combine and format data
      const taskPayments = (tasksData || []).map((task) => ({
        id: task.id,
        type: "task",
        name: task.title,
        amount: task.budget,
        date: task.updated_at,
        created_at: task.created_at,
      }));

      const materialPayments = (materialsData || []).map((material) => ({
        id: material.id,
        type: "purchase_order",
        name: material.name,
        amount: material.price_total,
        status: material.status,
        date: material.updated_at,
        created_at: material.created_at,
      }));

      const allPayments = [...taskPayments, ...materialPayments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setPayments(allPayments);
      setFilteredPayments(allPayments);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    }
  };

  const fetchOngoingCosts = async () => {
    try {
      // Get purchase orders marked as exclude_from_budget
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select(`
          id,
          name,
          price_total,
          status,
          created_at,
          updated_at
        `)
        .eq("project_id", projectId)
        .eq("exclude_from_budget", true);

      if (materialsError) throw materialsError;

      // Format data
      const materialCosts = (materialsData || []).map((material) => ({
        id: material.id,
        type: "purchase_order",
        name: material.name,
        amount: material.price_total,
        status: material.status,
        date: material.updated_at,
        created_at: material.created_at,
      }));

      const allCosts = materialCosts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setOngoingCosts(allCosts);
      setFilteredOngoingCosts(allCosts);
    } catch (error: any) {
      console.error("Error fetching ongoing costs:", error);
      toast({
        title: "Error",
        description: "Failed to load ongoing costs",
        variant: "destructive",
      });
    }
  };

  // Filter payments when filters change
  useEffect(() => {
    let filtered = [...payments];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((p) => p.type === filterType);
    }

    // Filter by date
    if (filterDate) {
      const targetDate = new Date(filterDate);
      filtered = filtered.filter((p) => {
        const paymentDate = new Date(p.date);
        return (
          paymentDate.getFullYear() === targetDate.getFullYear() &&
          paymentDate.getMonth() === targetDate.getMonth() &&
          paymentDate.getDate() === targetDate.getDate()
        );
      });
    }

    setFilteredPayments(filtered);
  }, [payments, filterType, filterDate]);

  // Filter ongoing costs when filters change
  useEffect(() => {
    let filtered = [...ongoingCosts];

    // Filter by type (future-proof, currently only purchase_order)
    if (ongoingFilterType !== "all") {
      filtered = filtered.filter((c) => c.type === ongoingFilterType);
    }

    // Filter by date
    if (ongoingFilterDate) {
      const targetDate = new Date(ongoingFilterDate);
      filtered = filtered.filter((c) => {
        const costDate = new Date(c.date);
        return (
          costDate.getFullYear() === targetDate.getFullYear() &&
          costDate.getMonth() === targetDate.getMonth() &&
          costDate.getDate() === targetDate.getDate()
        );
      });
    }

    setFilteredOngoingCosts(filtered);
  }, [ongoingCosts, ongoingFilterType, ongoingFilterDate]);

  const handleOpenPayments = () => {
    fetchPayments();
    setPaymentsDialogOpen(true);
  };

  const handleOpenOngoingCosts = () => {
    fetchOngoingCosts();
    setOngoingCostsDialogOpen(true);
  };

  const fetchCostByRoom = async () => {
    try {
      const { data: materialsData } = await supabase
        .from("materials")
        .select(`
          price_total,
          exclude_from_budget,
          room_id,
          room:rooms(name)
        `)
        .eq("project_id", projectId)
        .eq("exclude_from_budget", false);

      const roomCosts: any = {};
      materialsData?.forEach((mat: any) => {
        const roomName = mat.room?.name || "Ingen rum";
        roomCosts[roomName] = (roomCosts[roomName] || 0) + (mat.price_total || 0);
      });

      const data = Object.entries(roomCosts).map(([name, value]) => ({
        name,
        value,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      }));

      setCostByRoom(data);
    } catch (error) {
      console.error("Error fetching cost by room:", error);
    }
  };

  const fetchCostByCostCenter = async () => {
    try {
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("budget, cost_center")
        .eq("project_id", projectId);

      const centerCosts: any = {};
      tasksData?.forEach((task: any) => {
        const center = task.cost_center || "Ingen kostnadspost";
        centerCosts[center] = (centerCosts[center] || 0) + (task.budget || 0);
      });

      const data = Object.entries(centerCosts).map(([name, value]) => ({
        name,
        value,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      }));

      setCostByCostCenter(data);
    } catch (error) {
      console.error("Error fetching cost by cost center:", error);
    }
  };

  useEffect(() => {
    fetchPurchaseRequestData();
    fetchCostByRoom();
    fetchCostByCostCenter();

    // Set up real-time subscription
    const channel = supabase
      .channel('budget_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials'
        },
        () => {
          fetchPurchaseRequestData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchPurchaseRequestData = async () => {
    try {
      // Get all materials (purchase orders) for this project
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select("price_total, status, exclude_from_budget")
        .eq("project_id", projectId);

      if (materialsError) throw materialsError;

      // Calculate totals based on material status
      let pending = 0;
      let approved = 0;
      let pendingCnt = 0;
      let ongoing = 0;
      let ongoingCnt = 0;

      materialsData?.forEach((material: any) => {
        const cost = material.price_total || 0;
        
        // Separate ongoing costs (exclude_from_budget = true)
        if (material.exclude_from_budget) {
          ongoing += cost;
          ongoingCnt++;
          return;
        }
        
        // Regular budget items
        if (material.status === "new") {
          pending += cost;
          pendingCnt++;
        } else if (material.status === "done") {
          approved += cost;
        }
      });

      setPendingTotal(pending);
      setApprovedTotal(approved);
      setPendingCount(pendingCnt);
      setOngoingCostsTotal(ongoing);
      setOngoingCostsCount(ongoingCnt);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const budget = totalBudget || 0;
  const spent = spentAmount || 0;
  const committed = approvedTotal;
  const pending = pendingTotal;
  const remaining = budget - spent - committed - pending;

  const budgetPercentage = budget > 0 ? ((spent + committed) / budget) * 100 : 0;
  const pendingPercentage = budget > 0 ? (pending / budget) * 100 : 0;
  const remainingPercentage = budget > 0 ? (remaining / budget) * 100 : 0;

  // Pie chart data based on selected view
  const getPieData = () => {
    if (pieChartView === "room") {
      return costByRoom.filter(item => item.value > 0);
    } else if (pieChartView === "costCenter") {
      return costByCostCenter.filter(item => item.value > 0);
    }
    // Default: budget view
    return [
      { name: 'Payments', value: spent, color: '#ef4444' },
      { name: 'Vendor', value: committed, color: '#f97316' },
      { name: 'Pending', value: pending, color: '#eab308' },
      { name: 'Remaining', value: Math.max(0, remaining), color: '#22c55e' },
    ].filter(item => item.value > 0);
  };

  const pieData = getPieData();

  // Bar chart data (includes ongoing costs separately)
  const barData = [
    { category: 'Total Budget', amount: budget },
    { category: 'Payments', amount: spent },
    { category: 'Vendor', amount: committed },
    { category: 'Pending', amount: pending },
    { category: 'Löpande', amount: ongoingCostsTotal },
    { category: 'Remaining', amount: Math.max(0, remaining) },
  ];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${budget.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Project allocation
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={handleOpenPayments}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${spent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetPercentage.toFixed(1)}% of budget used • Click to view details
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              ${pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount} order{pendingCount !== 1 ? 's' : ''} pending
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={handleOpenOngoingCosts}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tillägg (utanför budget)</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${ongoingCostsTotal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Exklusive budget • {ongoingCostsCount} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            {remaining < 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : 'text-success'}`}>
              ${remaining.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {remaining < 0 ? 'Over budget!' : 'Available to spend'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alert */}
      {remaining < 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Budget Exceeded
            </CardTitle>
            <CardDescription>
              Your project is ${Math.abs(remaining).toLocaleString()} over budget. Consider reviewing pending orders or adjusting your budget.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {pendingPercentage > 20 && remaining > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="text-warning flex items-center gap-2">
              <Clock className="h-5 w-5" />
              High Pending Orders
            </CardTitle>
            <CardDescription>
              You have ${pending.toLocaleString()} ({pendingPercentage.toFixed(1)}% of budget) in pending purchase orders.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Budget Distribution</CardTitle>
                <CardDescription>
                  {pieChartView === "budget" && "Visual breakdown of budget allocation"}
                  {pieChartView === "room" && "Cost breakdown by room"}
                  {pieChartView === "costCenter" && "Cost breakdown by cost center"}
                </CardDescription>
              </div>
              <Select value={pieChartView} onValueChange={setPieChartView}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget Overview</SelectItem>
                  <SelectItem value="room">Per Rum</SelectItem>
                  <SelectItem value="costCenter">Per Kostnadspost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No budget data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Comparison</CardTitle>
            <CardDescription>Compare budget categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  fontSize={12}
                />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Budget</p>
                <p className="text-xs text-muted-foreground">Initial project allocation</p>
              </div>
              <p className="text-lg font-bold">${budget.toLocaleString()}</p>
            </div>

            <div 
              className="flex items-center justify-between pb-2 border-b cursor-pointer hover:bg-accent/50 transition-colors rounded p-2 -m-2"
              onClick={handleOpenPayments}
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Payments</p>
                <p className="text-xs text-muted-foreground">Already paid expenses • Click to view details</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-destructive">-${spent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{budgetPercentage.toFixed(1)}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b">
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: '#f97316' }}>Vendor</p>
                <p className="text-xs text-muted-foreground">Orders marked as done</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: '#f97316' }}>-${committed.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b">
              <div className="space-y-1 flex items-center gap-2">
                <p className="text-sm font-medium text-warning">Pending Orders</p>
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="text-warning">
                    {pendingCount}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-warning">-${pending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{pendingPercentage.toFixed(1)}%</p>
              </div>
            </div>

            <div 
              className="flex items-center justify-between pb-2 border-b cursor-pointer hover:bg-accent/50 transition-colors rounded p-2 -m-2"
              onClick={handleOpenOngoingCosts}
            >
              <div className="space-y-1 flex items-center gap-2">
                <p className="text-sm font-medium text-blue-600">Tillägg (utanför budget)</p>
                {ongoingCostsCount > 0 && (
                  <Badge variant="secondary" className="text-blue-600">
                    {ongoingCostsCount}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">${ongoingCostsTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Exklusive budget • Click for details</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-success">Available Budget</p>
                <p className="text-xs text-muted-foreground">Can still be allocated</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${remaining < 0 ? 'text-destructive' : 'text-success'}`}>
                  ${remaining.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {remainingPercentage.toFixed(1)}% remaining
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Detail Dialog */}
      <Dialog open={paymentsDialogOpen} onOpenChange={setPaymentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Budget Expenses</DialogTitle>
            <DialogDescription>
              All expenses included in project budget (tasks with budget + purchase orders)
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="filter-type" className="text-sm mb-2 block">
                <Filter className="h-4 w-4 inline mr-1" />
                Filter by Type
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="filter-date" className="text-sm mb-2 block">
                Filter by Date
              </Label>
              <div className="relative">
                <Input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">
                  ${filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No payments found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={`${payment.type}-${payment.id}`}>
                      <TableCell>
                        <Badge variant={payment.type === "task" ? "default" : "secondary"}>
                          {payment.type === "task" ? "Task" : "Purchase Order"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{payment.name}</TableCell>
                      <TableCell>
                        {payment.status ? (
                          <Badge variant="outline">{payment.status}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${payment.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString('sv-SE')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ongoing Costs Detail Dialog */}
      <Dialog open={ongoingCostsDialogOpen} onOpenChange={setOngoingCostsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tillägg (utanför budget) (Exklusive Budget)</DialogTitle>
            <DialogDescription>
              Operational costs not included in project budget
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="ongoing-filter-date" className="text-sm mb-2 block">
                Filter by Date
              </Label>
              <div className="relative">
                <Input
                  id="ongoing-filter-date"
                  type="date"
                  value={ongoingFilterDate}
                  onChange={(e) => setOngoingFilterDate(e.target.value)}
                />
                {ongoingFilterDate && (
                  <button
                    onClick={() => setOngoingFilterDate("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Tillägg (utanför budget)</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${filteredOngoingCosts.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="text-2xl font-bold text-blue-600">{filteredOngoingCosts.length}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These costs are excluded from project budget calculations
            </p>
          </div>

          {/* Costs Table */}
          {filteredOngoingCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No ongoing costs found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOngoingCosts.map((cost) => (
                    <TableRow key={`${cost.type}-${cost.id}`}>
                      <TableCell>
                        <Badge variant="secondary">
                          Purchase Order
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cost.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        ${cost.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(cost.date).toLocaleDateString('sv-SE')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetDashboard;