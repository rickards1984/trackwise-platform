import { useState, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Calendar,
  FileDown,
  Download,
  AreaChart,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("3months");
  const [activeTab, setActiveTab] = useState("otj");

  // OTJ Hours Data
  const { 
    data: otjData, 
    isLoading: isLoadingOtj, 
    error: otjError
  } = useQuery({
    queryKey: ["/api/reports/otj-hours", timeRange],
    enabled: !!user && activeTab === "otj"
  });

  // KSB Progress Data
  const { 
    data: ksbData, 
    isLoading: isLoadingKsb, 
    error: ksbError 
  } = useQuery({
    queryKey: ["/api/reports/ksb-progress", timeRange],
    enabled: !!user && activeTab === "ksb"
  });

  // Evidence Summary Data
  const { 
    data: evidenceData, 
    isLoading: isLoadingEvidence, 
    error: evidenceError 
  } = useQuery({
    queryKey: ["/api/reports/evidence-summary", timeRange],
    enabled: !!user && activeTab === "evidence"
  });

  // Activities Data
  const { 
    data: activitiesData, 
    isLoading: isLoadingActivities, 
    error: activitiesError 
  } = useQuery({
    queryKey: ["/api/reports/activities", timeRange],
    enabled: !!user && activeTab === "activities"
  });
  
  // Overall Progress Data
  const { 
    data: overallData, 
    isLoading: isLoadingOverall, 
    error: overallError 
  } = useQuery({
    queryKey: ["/api/reports/overall-progress"],
    enabled: !!user
  });

  // Format percentage for the pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Handle exporting reports
  const handleExport = async () => {
    try {
      window.open(`/api/reports/export?range=${timeRange}`, '_blank');
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 flex-1">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900">Progress Reports</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  View and analyze your apprenticeship progress
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-2">
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value)}>
                  <SelectTrigger className="w-[160px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">Last Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="1year">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="mb-6"
            >
              <TabsList className="mb-4">
                <TabsTrigger value="otj" className="flex items-center">
                  <BarChartIcon className="h-4 w-4 mr-2" />
                  OTJ Hours
                </TabsTrigger>
                <TabsTrigger value="ksb" className="flex items-center">
                  <LineChartIcon className="h-4 w-4 mr-2" />
                  KSB Progress
                </TabsTrigger>
                <TabsTrigger value="evidence" className="flex items-center">
                  <PieChartIcon className="h-4 w-4 mr-2" />
                  Evidence
                </TabsTrigger>
                <TabsTrigger value="activities" className="flex items-center">
                  <AreaChart className="h-4 w-4 mr-2" />
                  Activities
                </TabsTrigger>
              </TabsList>
              
              {/* OTJ Hours Tab */}
              <TabsContent value="otj">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Weekly OTJ Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingOtj ? (
                      <div className="h-80 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : otjError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load OTJ hours data. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={otjData?.weeklyData || []}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="week" />
                              <YAxis />
                              <Tooltip 
                                formatter={(value, name) => [
                                  name === 'hours' ? `${value} hours` : `${value} hours`, 
                                  name === 'hours' ? 'Hours Logged' : 'Target Hours'
                                ]}
                                labelFormatter={(label) => {
                                  const weekData = otjData?.weeklyData.find(w => w.week === label);
                                  return weekData ? `${label} (${weekData.startDate} - ${weekData.endDate})` : label;
                                }}
                              />
                              <Legend />
                              <Bar dataKey="hours" fill="#2563EB" name="Hours Logged" />
                              <Bar dataKey="target" fill="#10B981" name="Target Hours" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">
                              Total Hours: <span className="text-primary">{otjData?.summary?.totalHours || 0} hours</span>
                            </p>
                            <p className="text-sm text-neutral-500">
                              Target: {otjData?.summary?.totalTargetHours || 0} hours 
                              ({otjData?.summary?.weeklyAverage || 0} hours/week average)
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExport}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Data
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* KSB Progress Tab */}
              <TabsContent value="ksb">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">KSB Progress Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingKsb ? (
                      <div className="h-80 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : ksbError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load KSB progress data. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={ksbData?.monthlyData || []}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="knowledge" stroke="#2563EB" name="Knowledge" />
                              <Line type="monotone" dataKey="skills" stroke="#10B981" name="Skills" />
                              <Line type="monotone" dataKey="behaviors" stroke="#F59E0B" name="Behaviors" />
                            </LineChart>
                          </ResponsiveContainer>
                          <p className="text-sm text-neutral-500 text-center mt-2">
                            Progress over last {ksbData?.monthlyData?.length || 0} months
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-4">Current KSB Status</h3>
                          {ksbData?.progressData?.map((item, index) => (
                            <div key={index} className="mb-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-neutral-500">{item.achieved} / {item.total} completed</span>
                              </div>
                              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                                <div
                                  className="h-2.5 rounded-full"
                                  style={{
                                    width: `${(item.achieved / item.total) * 100}%`,
                                    backgroundColor: COLORS[index % COLORS.length]
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t pt-4 mt-4">
                            <h3 className="text-sm font-medium mb-2">Summary</h3>
                            <p className="text-sm text-neutral-600 mb-2">
                              You have completed <span className="font-medium">
                                {ksbData?.summary?.totalAchieved || 0} out of {ksbData?.summary?.totalKsbs || 0}
                              </span> KSBs, which is <span className="font-medium text-primary">
                                {ksbData?.summary?.completionPercentage || 0}%
                              </span> of the total.
                            </p>
                            <p className="text-sm text-neutral-600">
                              {ksbData?.summary?.completionPercentage >= 75 ? 
                                "Based on your current progress, you are ahead of schedule for your apprenticeship completion." :
                              ksbData?.summary?.completionPercentage >= 50 ? 
                                "Your progress is on track with your apprenticeship completion timeline." :
                                "Consider focusing on more KSBs to stay on track with your apprenticeship timeline."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Evidence Tab */}
              <TabsContent value="evidence">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Evidence Submission Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingEvidence ? (
                      <div className="h-80 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : evidenceError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load evidence data. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={evidenceData?.evidenceStatusData || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {(evidenceData?.evidenceStatusData || []).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                          <p className="text-sm text-neutral-500 text-center mt-2">Evidence by Status</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-4">Evidence Submission Stats</h3>
                          <div className="space-y-4">
                            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                              <div className="text-xl font-bold">{evidenceData?.summary?.totalEvidence || 0}</div>
                              <div className="text-sm text-neutral-500">Total Evidence Items</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                                <div className="text-xl font-bold text-emerald-600">
                                  {evidenceData?.summary?.approvalRate || 0}%
                                </div>
                                <div className="text-sm text-neutral-500">Approval Rate</div>
                              </div>
                              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                                <div className="text-xl font-bold text-amber-500">
                                  {evidenceData?.summary?.averageReviewDays || 0}
                                </div>
                                <div className="text-sm text-neutral-500">Avg. Review Days</div>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <h3 className="text-sm font-medium mb-2">Recent Activity</h3>
                              <ul className="space-y-2 text-sm">
                                <li className="flex justify-between">
                                  <span>Evidence Submitted</span>
                                  <span className="text-neutral-500">
                                    {evidenceData?.recentActivity?.submitted || 0} this month
                                  </span>
                                </li>
                                <li className="flex justify-between">
                                  <span>Evidence Approved</span>
                                  <span className="text-neutral-500">
                                    {evidenceData?.recentActivity?.approved || 0} this month
                                  </span>
                                </li>
                                <li className="flex justify-between">
                                  <span>Pending Review</span>
                                  <span className="text-neutral-500">
                                    {evidenceData?.recentActivity?.pendingReview || 0} items
                                  </span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Activities Tab */}
              <TabsContent value="activities">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Activity Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingActivities ? (
                      <div className="h-80 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : activitiesError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load activities data. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : activitiesData?.activityTypeData?.length === 0 ? (
                      <div className="h-80 flex items-center justify-center flex-col text-center p-4">
                        <AreaChart className="h-12 w-12 text-neutral-300 mb-3" />
                        <h3 className="text-lg font-medium text-neutral-700">No activity data yet</h3>
                        <p className="text-sm text-neutral-500 max-w-md mt-2">
                          Start logging your OTJ activities to see a breakdown of how you're spending your learning time.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={activitiesData?.activityTypeData || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="hours"
                              >
                                {(activitiesData?.activityTypeData || []).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} hours`, 'Hours Spent']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-3">Activity Summary</h3>
                          <dl className="space-y-4">
                            <div className="flex justify-between">
                              <dt className="text-sm font-medium text-neutral-500">Total Activity Hours</dt>
                              <dd className="text-sm font-bold">{activitiesData?.summary?.totalHours || 0}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm font-medium text-neutral-500">Most Common Activity</dt>
                              <dd className="text-sm font-bold">{activitiesData?.summary?.mostCommonActivity || 'None'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm font-medium text-neutral-500">Least Common Activity</dt>
                              <dd className="text-sm font-bold">{activitiesData?.summary?.leastCommonActivity || 'None'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm font-medium text-neutral-500">Category Spread</dt>
                              <dd className="text-sm font-bold">{activitiesData?.summary?.categoryCount || 0} different types</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* OTJ Hours Progress */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>OTJ Hours Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOverall ? (
                    <div className="h-24 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : overallError ? (
                    <div className="text-sm text-red-500">Failed to load data</div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="text-3xl font-bold">
                        {overallData?.otjHoursProgress?.current || 0} / {overallData?.otjHoursProgress?.required || 0}
                      </div>
                      <div className="text-sm text-neutral-500">Total Hours Completed</div>
                      <div className="h-2 w-full bg-slate-200 rounded-full mt-2">
                        <div 
                          className="h-2 bg-primary rounded-full" 
                          style={{ width: `${overallData?.otjHoursProgress?.percentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <div className="text-xs text-neutral-500">
                          {overallData?.otjHoursProgress?.percentage || 0}% Complete
                        </div>
                        <div className="text-xs text-neutral-500">
                          {Math.max(0, (overallData?.otjHoursProgress?.required || 0) - (overallData?.otjHoursProgress?.current || 0))} hours remaining
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* KSB Coverage */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>KSB Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOverall ? (
                    <div className="h-24 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : overallError ? (
                    <div className="text-sm text-red-500">Failed to load data</div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="text-3xl font-bold">
                        {overallData?.ksbCoverage?.covered || 0} / {overallData?.ksbCoverage?.total || 0}
                      </div>
                      <div className="text-sm text-neutral-500">KSBs With Evidence</div>
                      <div className="h-2 w-full bg-slate-200 rounded-full mt-2">
                        <div 
                          className="h-2 bg-primary rounded-full" 
                          style={{ width: `${overallData?.ksbCoverage?.percentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <div className="text-xs text-neutral-500">
                          {overallData?.ksbCoverage?.percentage || 0}% Covered
                        </div>
                        <div className="text-xs text-neutral-500">
                          {Math.max(0, (overallData?.ksbCoverage?.total || 0) - (overallData?.ksbCoverage?.covered || 0))} KSBs remaining
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Overall Completion */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Overall Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOverall ? (
                    <div className="h-24 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : overallError ? (
                    <div className="text-sm text-red-500">Failed to load data</div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="text-3xl font-bold">
                        {overallData?.overallCompletion?.percentage || 0}%
                      </div>
                      <div className="text-sm text-neutral-500">Program Completion</div>
                      <div className="h-2 w-full bg-slate-200 rounded-full mt-2">
                        <div 
                          className="h-2 bg-primary rounded-full" 
                          style={{ width: `${overallData?.overallCompletion?.percentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <div className="text-xs text-neutral-500">
                          Started {overallData?.overallCompletion?.startDate || 'N/A'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Ends {overallData?.overallCompletion?.expectedEndDate || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}