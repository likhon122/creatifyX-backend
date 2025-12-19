import { Types } from 'mongoose';

export type TOrganization = {
  name: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
};
