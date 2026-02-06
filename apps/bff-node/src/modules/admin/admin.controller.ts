import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('v1/admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) { }

  // Dashboard
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getDashboardStats();
  }

  // LLM Configuration
  @Get('config/llm')
  @ApiOperation({ summary: 'Get LLM configuration' })
  async getLLMConfig(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getLLMConfig();
  }

  @Put('config/llm/:key')
  @ApiOperation({ summary: 'Update LLM configuration' })
  async updateLLMConfig(
    @Request() req,
    @Param('key') key: string,
    @Body() body: { value: any },
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.updateLLMConfig(key, body.value);
  }

  // UCP Tools
  @Post('tools/sync-new-tools')
  @ApiOperation({ summary: 'Sync new UCP tools to database' })
  async syncNewUcpTools(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.syncNewUcpTools();
  }

  // Taxonomy
  @Get('taxonomy/categories')
  @ApiOperation({ summary: 'Get category taxonomy' })
  async getTaxonomy(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getTaxonomy();
  }

  @Put('taxonomy/categories')
  @ApiOperation({ summary: 'Update category taxonomy' })
  async updateTaxonomy(@Request() req, @Body() taxonomy: any) {
    this.ensureAdmin(req.user);
    return this.adminService.updateTaxonomy(taxonomy);
  }

  @Get('taxonomy/brands')
  @ApiOperation({ summary: 'Get brands dictionary' })
  async getBrands(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getBrands();
  }

  @Put('taxonomy/brands')
  @ApiOperation({ summary: 'Update brands dictionary' })
  async updateBrands(@Request() req, @Body() brands: any) {
    this.ensureAdmin(req.user);
    return this.adminService.updateBrands(brands);
  }

  // Provider Configuration
  @Get('config/providers')
  @ApiOperation({ summary: 'Get provider configuration' })
  async getProviderConfig(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getProviderConfig();
  }

  @Put('config/providers/:key')
  @ApiOperation({ summary: 'Update provider configuration' })
  async updateProviderConfig(
    @Request() req,
    @Param('key') key: string,
    @Body() body: { value: any },
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.updateProviderConfig(key, body.value);
  }

  // Provider Management
  @Get('providers')
  @ApiOperation({ summary: 'Get all providers' })
  async getProviders(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getProviders();
  }

  @Get('providers/:providerId')
  @ApiOperation({ summary: 'Get provider by ID' })
  async getProvider(@Request() req, @Param('providerId') providerId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.getProvider(providerId);
  }

  @Put('providers/:providerId')
  @ApiOperation({ summary: 'Update provider configuration' })
  async updateProvider(
    @Request() req,
    @Param('providerId') providerId: string,
    @Body() config: any,
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.updateProvider(providerId, config);
  }

  @Put('providers/:providerId/mappings')
  @ApiOperation({ summary: 'Update provider mappings' })
  async updateProviderMappings(
    @Request() req,
    @Param('providerId') providerId: string,
    @Body() mappings: any,
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.updateProviderMappings(providerId, mappings);
  }

  @Get('providers/:providerId/stats')
  @ApiOperation({ summary: 'Get provider statistics' })
  async getProviderStats(@Request() req, @Param('providerId') providerId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.getProviderStats(providerId);
  }

  @Post('providers/:providerId/test')
  @ApiOperation({ summary: 'Test provider connection' })
  async testProviderConnection(@Request() req, @Param('providerId') providerId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.testProviderConnection(providerId);
  }

  // Tool Configuration
  @Put('providers/:providerId/tools/:toolName/config')
  @ApiOperation({ summary: 'Update tool configuration with API settings' })
  async updateToolConfig(
    @Request() req,
    @Param('providerId') providerId: string,
    @Param('toolName') toolName: string,
    @Body() config: any,
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.updateToolConfig(providerId, toolName, config);
  }

  // Tool Schema Management
  @Get('providers/:providerId/tools/:toolName/schema')
  @ApiOperation({ summary: 'Get tool schema (request or response)' })
  async getToolSchema(
    @Request() req,
    @Param('providerId') providerId: string,
    @Param('toolName') toolName: string,
    @Query('type') schemaType: string = 'request',
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.getToolSchema(providerId, toolName, schemaType);
  }

  @Put('providers/:providerId/tools/:toolName/schema')
  @ApiOperation({ summary: 'Upload custom tool schema' })
  async uploadToolSchema(
    @Request() req,
    @Param('providerId') providerId: string,
    @Param('toolName') toolName: string,
    @Query('type') schemaType: string = 'request',
    @Body() body: { schema: any },
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.uploadToolSchema(providerId, toolName, schemaType, body.schema);
  }

  @Delete('providers/:providerId/tools/:toolName/schema')
  @ApiOperation({ summary: 'Reset tool schema to default' })
  async resetToolSchema(
    @Request() req,
    @Param('providerId') providerId: string,
    @Param('toolName') toolName: string,
    @Query('type') schemaType: string = 'request',
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.resetToolSchema(providerId, toolName, schemaType);
  }

  @Get('tools/:toolName/schema/default')
  @ApiOperation({ summary: 'Get default schema for a tool' })
  async getDefaultToolSchema(
    @Request() req,
    @Param('toolName') toolName: string,
    @Query('type') schemaType: string = 'request',
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.getDefaultToolSchema(toolName, schemaType);
  }

  // Tool Testing
  @Post('providers/:providerId/tools/:toolName/test')
  @ApiOperation({ summary: 'Test tool endpoint with payload' })
  async testToolEndpoint(
    @Request() req,
    @Param('providerId') providerId: string,
    @Param('toolName') toolName: string,
    @Body() body: { payload: any },
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.testToolEndpoint(providerId, toolName, body.payload);
  }

  @Post('tools/test')
  @ApiOperation({ summary: 'Test MCP tool' })
  async testTool(
    @Request() req,
    @Body() body: { toolName: string; request: any },
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.testTool(body.toolName, body.request);
  }

  // Monitoring
  @Get('monitoring/sessions')
  @ApiOperation({ summary: 'Get chat sessions' })
  async getSessions(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.getSessions(limit || 50, offset || 0);
  }

  @Get('monitoring/tool-calls')
  @ApiOperation({ summary: 'Get tool call statistics' })
  async getToolCallStats(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getToolCallStats();
  }

  @Get('monitoring/errors')
  @ApiOperation({ summary: 'Get error logs' })
  async getErrorLogs(@Request() req, @Query('limit') limit?: number) {
    this.ensureAdmin(req.user);
    return this.adminService.getErrorLogs(limit || 100);
  }

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get users' })
  async getUsers(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.getUsers(limit || 50, offset || 0);
  }

  @Get('users/:userId/sessions')
  @ApiOperation({ summary: 'Get user sessions' })
  async getUserSessions(@Request() req, @Param('userId') userId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.getUserSessions(userId);
  }

  // =====================================================
  // CATEGORIES MANAGEMENT
  // =====================================================

  @Get('categories')
  @ApiOperation({ summary: 'Get all predefined categories' })
  async getCategories(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getCategories();
  }

  @Get('categories/:categoryId')
  @ApiOperation({ summary: 'Get category by ID' })
  async getCategory(@Request() req, @Param('categoryId') categoryId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.getCategory(categoryId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Request() req, @Body() body: { id: string; name: string; description?: string; icon?: string; displayOrder?: number }) {
    this.ensureAdmin(req.user);
    return this.adminService.createCategory(body);
  }

  @Put('categories/:categoryId')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(
    @Request() req,
    @Param('categoryId') categoryId: string,
    @Body() body: { name?: string; description?: string; icon?: string; displayOrder?: number; enabled?: boolean },
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.updateCategory(categoryId, body);
  }

  @Delete('categories/:categoryId')
  @ApiOperation({ summary: 'Delete a category' })
  async deleteCategory(@Request() req, @Param('categoryId') categoryId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.deleteCategory(categoryId);
  }

  // Provider Categories
  @Get('providers/:providerId/categories')
  @ApiOperation({ summary: 'Get categories for a provider' })
  async getProviderCategories(@Request() req, @Param('providerId') providerId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.getProviderCategories(providerId);
  }

  @Put('providers/:providerId/categories')
  @ApiOperation({ summary: 'Update provider supported categories' })
  async updateProviderCategories(
    @Request() req,
    @Param('providerId') providerId: string,
    @Body() body: { categoryIds: string[] },
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.updateProviderCategories(providerId, body.categoryIds);
  }

  // =====================================================
  // UCP TOOLS MANAGEMENT (GLOBAL)
  // =====================================================

  @Get('ucp-tools')
  @ApiOperation({ summary: 'Get all global UCP tools' })
  async getUcpTools(@Request() req) {
    this.ensureAdmin(req.user);
    return this.adminService.getUcpTools();
  }

  @Get('ucp-tools/:toolId')
  @ApiOperation({ summary: 'Get UCP tool by ID' })
  async getUcpTool(@Request() req, @Param('toolId') toolId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.getUcpTool(toolId);
  }

  @Post('ucp-tools')
  @ApiOperation({ summary: 'Create a new UCP tool' })
  async createUcpTool(@Request() req, @Body() body: any) {
    this.ensureAdmin(req.user);
    return this.adminService.createUcpTool(body);
  }

  @Put('ucp-tools/:toolId')
  @ApiOperation({ summary: 'Update a UCP tool' })
  async updateUcpTool(@Request() req, @Param('toolId') toolId: string, @Body() body: any) {
    this.ensureAdmin(req.user);
    return this.adminService.updateUcpTool(toolId, body);
  }

  @Delete('ucp-tools/:toolId')
  @ApiOperation({ summary: 'Delete a UCP tool' })
  async deleteUcpTool(@Request() req, @Param('toolId') toolId: string) {
    this.ensureAdmin(req.user);
    return this.adminService.deleteUcpTool(toolId);
  }

  @Get('ucp-tools/:toolId/schema/readable')
  @ApiOperation({ summary: 'Get UCP tool schema in human-readable format' })
  async getUcpToolReadableSchema(
    @Request() req,
    @Param('toolId') toolId: string,
    @Query('type') schemaType: 'request' | 'response' = 'request',
  ) {
    this.ensureAdmin(req.user);
    return this.adminService.getUcpToolReadableSchema(toolId, schemaType);
  }

  private ensureAdmin(user: any) {
    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }
  }
}
