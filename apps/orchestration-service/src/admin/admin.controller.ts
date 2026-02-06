import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ProvidersService } from './providers.service';
import { ToolsService } from './tools.service';

@Controller('admin')
@ApiTags('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private providersService: ProvidersService,
    private toolsService: ToolsService,
  ) {}

  // Dashboard & Monitoring
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get chat sessions' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getSessions(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.adminService.getSessions(limit, offset);
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get error logs' })
  @ApiQuery({ name: 'limit', required: false })
  async getErrorLogs(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getErrorLogs(limit);
  }

  // LLM Configuration
  @Get('config/llm')
  @ApiOperation({ summary: 'Get LLM configuration' })
  async getLLMConfig() {
    return this.adminService.getLLMConfig();
  }

  @Put('config/llm/:key')
  @ApiOperation({ summary: 'Update LLM configuration' })
  @ApiParam({ name: 'key', description: 'Config key' })
  async updateLLMConfig(
    @Param('key') key: string,
    @Body() body: { value: any },
  ) {
    return this.adminService.updateLLMConfig(key, body.value);
  }

  // Taxonomy
  @Get('taxonomy/categories')
  @ApiOperation({ summary: 'Get category taxonomy' })
  async getTaxonomy() {
    return this.adminService.getTaxonomy();
  }

  @Put('taxonomy/categories')
  @ApiOperation({ summary: 'Update category taxonomy' })
  async updateTaxonomy(@Body() taxonomy: any) {
    return this.adminService.updateTaxonomy(taxonomy);
  }

  @Get('taxonomy/brands')
  @ApiOperation({ summary: 'Get brands dictionary' })
  async getBrands() {
    return this.adminService.getBrands();
  }

  @Put('taxonomy/brands')
  @ApiOperation({ summary: 'Update brands dictionary' })
  async updateBrands(@Body() brands: any) {
    return this.adminService.updateBrands(brands);
  }

  // Provider Configuration
  @Get('config/providers')
  @ApiOperation({ summary: 'Get provider configuration' })
  async getProviderConfig() {
    return this.adminService.getProviderConfig();
  }

  @Put('config/providers/:key')
  @ApiOperation({ summary: 'Update provider configuration' })
  async updateProviderConfig(
    @Param('key') key: string,
    @Body() body: { value: any },
  ) {
    return this.adminService.updateProviderConfig(key, body.value);
  }

  // Provider Management
  @Get('providers')
  @ApiOperation({ summary: 'Get all providers' })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  async getProviders(@Query('enabled') enabled?: boolean) {
    return this.providersService.getProviders(
      enabled !== undefined ? { enabled: enabled === true } : undefined
    );
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  async getProvider(@Param('id') id: string) {
    return this.providersService.getProvider(id);
  }

  @Post('providers')
  @ApiOperation({ summary: 'Create new provider' })
  async createProvider(@Body() providerData: any) {
    return this.providersService.createProvider(providerData);
  }

  @Put('providers/:id')
  @ApiOperation({ summary: 'Update provider configuration' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  async updateProvider(@Param('id') id: string, @Body() config: any) {
    return this.providersService.updateProvider(id, config);
  }

  @Delete('providers/:id')
  @ApiOperation({ summary: 'Delete provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  async deleteProvider(@Param('id') id: string) {
    return this.providersService.deleteProvider(id);
  }

  @Put('providers/:id/mappings')
  @ApiOperation({ summary: 'Update provider field/category mappings' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  async updateProviderMappings(@Param('id') id: string, @Body() mappings: any) {
    return this.providersService.updateProviderMappings(id, mappings);
  }

  @Get('providers/:id/stats')
  @ApiOperation({ summary: 'Get provider statistics' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  async getProviderStats(@Param('id') id: string) {
    return this.providersService.getProviderStats(id);
  }

  @Put('providers/:id/tools/:toolName')
  @ApiOperation({ summary: 'Update provider tool configuration' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiParam({ name: 'toolName', description: 'Tool name' })
  async updateToolConfig(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() config: any,
  ) {
    return this.providersService.updateToolConfig(id, toolName, config);
  }

  // UCP Tools Management
  @Get('ucp-tools')
  @ApiOperation({ summary: 'Get all UCP tools' })
  @ApiQuery({ name: 'toolType', required: false })
  @ApiQuery({ name: 'isInternal', required: false, type: Boolean })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  async getUcpTools(
    @Query('toolType') toolType?: string,
    @Query('isInternal') isInternal?: boolean,
    @Query('enabled') enabled?: boolean,
  ) {
    return this.toolsService.getUcpTools({
      toolType,
      isInternal: isInternal !== undefined ? isInternal === true : undefined,
      enabled: enabled !== undefined ? enabled === true : undefined,
    });
  }

  @Get('ucp-tools/internal')
  @ApiOperation({ summary: 'Get internal tools' })
  async getInternalTools() {
    return this.toolsService.getInternalTools();
  }

  @Get('ucp-tools/provider')
  @ApiOperation({ summary: 'Get provider tools' })
  async getProviderTools() {
    return this.toolsService.getProviderTools();
  }

  @Get('ucp-tools/:id')
  @ApiOperation({ summary: 'Get UCP tool by ID' })
  @ApiParam({ name: 'id', description: 'Tool ID' })
  async getUcpTool(@Param('id') id: string) {
    return this.toolsService.getUcpTool(id);
  }

  @Put('ucp-tools/:id')
  @ApiOperation({ summary: 'Update UCP tool configuration' })
  @ApiParam({ name: 'id', description: 'Tool ID' })
  async updateUcpTool(@Param('id') id: string, @Body() updates: any) {
    return this.toolsService.updateUcpTool(id, updates);
  }

  @Get('ucp-tools/stats/calls')
  @ApiOperation({ summary: 'Get tool call statistics' })
  @ApiQuery({ name: 'days', required: false })
  @ApiQuery({ name: 'isInternal', required: false, type: Boolean })
  async getToolCallStats(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @Query('isInternal') isInternal?: boolean,
  ) {
    return this.toolsService.getToolCallStats({
      days,
      isInternal: isInternal !== undefined ? isInternal === true : undefined,
    });
  }

  // Tool Synchronization
  @Post('tools/sync-new-tools')
  @ApiOperation({ summary: 'Sync new UCP tools to database' })
  async syncNewUcpTools() {
    return this.adminService.syncNewUcpTools();
  }

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get users list' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getUsers(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.adminService.getUsers(limit, offset);
  }

  @Get('users/:userId/sessions')
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserSessions(@Param('userId') userId: string) {
    return this.adminService.getUserSessions(userId);
  }

  // Multi-Agent System
  @Get('agents')
  @ApiOperation({ summary: 'Get all registered agents with their metadata' })
  async getAgents() {
    return this.adminService.getAgents();
  }
}
