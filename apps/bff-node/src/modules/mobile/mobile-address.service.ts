import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoAddressFields } from '../../mongo/schemas/address.schema';
import { MongoUserAddress } from '../../mongo/schemas/user-address.schema';

export interface SaveAddressPayload {
  shipping: MongoAddressFields;
  billing?: MongoAddressFields;
  billingSameAsShipping?: boolean;
}

@Injectable()
export class MobileAddressService {
  constructor(
    @InjectModel(MongoUserAddress.name) private addressModel: Model<MongoUserAddress>,
  ) {}

  async saveAddress(userId: string, dto: SaveAddressPayload): Promise<{ userId: string; shipping: MongoAddressFields; billing: MongoAddressFields }> {
    const billing = dto.billingSameAsShipping ? { ...dto.shipping } : (dto.billing ?? { ...dto.shipping });
    const doc = await this.addressModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          addresses: {
            shipping: dto.shipping,
            billing,
          },
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    ).exec();
    return {
      userId: doc.userId,
      shipping: doc.addresses.shipping as MongoAddressFields,
      billing: doc.addresses.billing as MongoAddressFields,
    };
  }

  async getAddress(userId: string): Promise<{ shipping: MongoAddressFields; billing: MongoAddressFields } | null> {
    const doc = await this.addressModel.findOne({ userId }).lean().exec();
    if (!doc) return null;
    return {
      shipping: doc.addresses.shipping as MongoAddressFields,
      billing: doc.addresses.billing as MongoAddressFields,
    };
  }
}
