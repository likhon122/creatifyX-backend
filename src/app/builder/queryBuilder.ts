import { PipelineStage, Types } from 'mongoose';

type QueryParams = Record<string, unknown>;

type SortDirection = 1 | -1;

type SortDefinition = Record<string, SortDirection>;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

class QueryBuilder {
  private readonly params: QueryParams;
  private readonly andConditions: Record<string, unknown>[] = [];
  private projection?: Record<string, 0 | 1>;
  private sortBy: SortDefinition = { createdAt: -1 };
  private page = 1;
  private limit = DEFAULT_LIMIT;
  private skip = 0;

  constructor(params: QueryParams = {}) {
    this.params = params;
  }

  private toBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'no'].includes(normalized)) return false;
    }
    return undefined;
  }

  private toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }

  private toStringValue(value: unknown, lower = true): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return lower ? trimmed.toLowerCase() : trimmed;
    }
    return undefined;
  }

  private toStringArray(value: unknown, lower = true): string[] {
    if (Array.isArray(value)) {
      return value
        .map(val => this.toStringValue(val, lower))
        .filter((val): val is string => Boolean(val));
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map(val => this.toStringValue(val, lower))
        .filter((val): val is string => Boolean(val));
    }

    return [];
  }

  private toObjectIdArray(value: unknown): Types.ObjectId[] {
    const values = this.toStringArray(value, false);
    return values
      .map(val =>
        Types.ObjectId.isValid(val) ? new Types.ObjectId(val) : null
      )
      .filter((val): val is Types.ObjectId => Boolean(val));
  }

  private pushCondition(condition: Record<string, unknown>) {
    this.andConditions.push(condition);
  }

  search(fields: string[]) {
    const term =
      (this.params.search as string) ||
      (this.params.searchTerm as string) ||
      (this.params.q as string);

    if (term && term.trim()) {
      const regex = new RegExp(term.trim(), 'i');
      this.pushCondition({
        $or: fields.map(field => ({ [field]: { $regex: regex } })),
      });
    }

    return this;
  }

  filterExact(paramKey: string, field: string, options?: { lower?: boolean }) {
    const value = this.toStringValue(
      this.params[paramKey],
      options?.lower ?? true
    );
    if (value) {
      this.pushCondition({ [field]: value });
    }
    return this;
  }

  filterBoolean(paramKey: string, field: string) {
    const value = this.toBoolean(this.params[paramKey]);
    if (typeof value === 'boolean') {
      this.pushCondition({ [field]: value });
    }
    return this;
  }

  filterArray(paramKey: string, field: string, mode: 'all' | 'in' = 'all') {
    const values = this.toStringArray(this.params[paramKey]);
    if (values.length) {
      const operator = mode === 'all' ? '$all' : '$in';
      this.pushCondition({ [field]: { [operator]: values } });
    }
    return this;
  }

  filterObjectIdArray(
    paramKey: string,
    field: string,
    mode: 'all' | 'in' = 'all'
  ) {
    const objectIds = this.toObjectIdArray(this.params[paramKey]);
    if (objectIds.length) {
      const operator = mode === 'all' ? '$all' : '$in';
      this.pushCondition({ [field]: { [operator]: objectIds } });
    }
    return this;
  }

  filterObjectId(paramKey: string, field: string) {
    const value = this.toStringValue(this.params[paramKey], false);
    if (value && Types.ObjectId.isValid(value)) {
      this.pushCondition({ [field]: new Types.ObjectId(value) });
    }
    return this;
  }

  range(field: string, minKey: string, maxKey: string) {
    const min = this.toNumber(this.params[minKey]);
    const max = this.toNumber(this.params[maxKey]);

    if (min === undefined && max === undefined) {
      return this;
    }

    const condition: Record<string, number> = {};
    if (min !== undefined) condition.$gte = min;
    if (max !== undefined) condition.$lte = max;

    this.pushCondition({ [field]: condition });
    return this;
  }

  metadataKeywords(paramKey: string) {
    const values = this.toStringArray(this.params[paramKey]);
    if (values.length) {
      this.pushCondition({
        $or: [
          { 'metadata.manualKeywords': { $in: values } },
          { 'metadata.aiGenerated.keywords': { $in: values } },
        ],
      });
    }
    return this;
  }

  metadataColors(paramKey: string) {
    const colors = this.toStringArray(this.params[paramKey]);
    if (colors.length) {
      this.pushCondition({
        'metadata.aiGenerated.dominantColors': { $in: colors },
      });
    }
    return this;
  }

  sort(defaultField = '-createdAt') {
    const sortValue =
      this.toStringValue(this.params.sort, false) || defaultField;
    if (!sortValue) return this;

    const sortFields = sortValue
      .split(',')
      .map(field => field.trim())
      .filter(Boolean);

    if (!sortFields.length) return this;

    const sortDefinition: SortDefinition = {};
    sortFields.forEach(field => {
      if (field.startsWith('-')) {
        sortDefinition[field.substring(1)] = -1;
      } else {
        sortDefinition[field] = 1;
      }
    });

    this.sortBy = Object.keys(sortDefinition).length
      ? sortDefinition
      : this.sortBy;

    return this;
  }

  project() {
    const fieldsValue = this.toStringValue(this.params.fields, false);
    if (!fieldsValue) return this;

    const fields = fieldsValue
      .split(',')
      .map(field => field.trim())
      .filter(Boolean);

    if (!fields.length) return this;

    const projection: Record<string, 0 | 1> = { _id: 1 };
    fields.forEach(field => {
      projection[field] = 1;
    });

    this.projection = projection;
    return this;
  }

  paginate(defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) {
    const requestedPage = this.toNumber(this.params.page) ?? 1;
    const requestedLimit = this.toNumber(this.params.limit) ?? defaultLimit;

    this.page = requestedPage > 0 ? Math.floor(requestedPage) : 1;
    const calculatedLimit =
      requestedLimit > 0 ? Math.floor(requestedLimit) : defaultLimit;
    this.limit = Math.min(calculatedLimit, maxLimit);
    this.skip = (this.page - 1) * this.limit;
    return this;
  }

  build() {
    const stages: PipelineStage[] = [];
    const matchStage = this.buildMatchStage();
    if (matchStage) stages.push(matchStage);

    if (this.sortBy && Object.keys(this.sortBy).length) {
      stages.push({ $sort: this.sortBy });
    }

    stages.push({ $skip: this.skip });
    stages.push({ $limit: this.limit });

    if (this.projection) {
      stages.push({ $project: this.projection });
    }

    const countStages: PipelineStage[] = [];
    if (matchStage) countStages.push(matchStage);
    countStages.push({ $count: 'total' });

    return {
      resultStages: stages,
      countStages,
    };
  }

  buildMeta(total: number) {
    const totalPages = total > 0 ? Math.ceil(total / this.limit) : 0;
    return {
      total,
      page: this.page,
      limit: this.limit,
      totalPages,
      hasMore: this.page < totalPages,
    };
  }

  private buildMatchStage(): PipelineStage.Match | undefined {
    if (!this.andConditions.length) {
      return undefined;
    }

    if (this.andConditions.length === 1) {
      return { $match: this.andConditions[0] };
    }

    return { $match: { $and: this.andConditions } };
  }
}

export default QueryBuilder;
