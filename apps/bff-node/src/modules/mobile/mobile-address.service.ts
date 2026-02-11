import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { MongoAddressFields, AddressType } from '../../mongo/schemas/address.schema';
import { MongoUserAddress } from '../../mongo/schemas/user-address.schema';
import { AddAddressDto, UpdateAddressDto } from './dto/address.dto';

export interface AddressEntry {
  addressId: string;
  type: AddressType;
  label?: string;
  isDefault: boolean;
  address: MongoAddressFields;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MobileAddressService {
  constructor(
    @InjectModel(MongoUserAddress.name) private addressModel: Model<MongoUserAddress>,
  ) {}

  /**
   * Get all addresses for a user
   */
  async getAllAddresses(userId: string): Promise<AddressEntry[]> {
    const doc = await this.addressModel.findOne({ userId }).lean().exec();
    if (!doc || !doc.addresses) return [];
    return doc.addresses as AddressEntry[];
  }

  /**
   * Get a single address by ID
   */
  async getAddressById(userId: string, addressId: string): Promise<AddressEntry | null> {
    const doc = await this.addressModel.findOne({ userId }).lean().exec();
    if (!doc || !doc.addresses) return null;
    return (doc.addresses as AddressEntry[]).find(a => a.addressId === addressId) || null;
  }

  /**
   * Get default address for a user
   */
  async getDefaultAddress(userId: string): Promise<AddressEntry | null> {
    const addresses = await this.getAllAddresses(userId);
    return addresses.find(a => a.isDefault) || addresses[0] || null;
  }

  /**
   * Add a new address
   */
  async addAddress(userId: string, dto: AddAddressDto): Promise<AddressEntry> {
    const newAddress: AddressEntry = {
      addressId: uuidv4(),
      type: dto.type,
      label: dto.label,
      isDefault: dto.isDefault || false,
      address: dto.address as MongoAddressFields,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If this is the first address or marked as default, ensure it's the only default
    const existingDoc = await this.addressModel.findOne({ userId }).lean().exec();
    
    if (!existingDoc) {
      // Create new document with this address
      newAddress.isDefault = true; // First address is always default
      await this.addressModel.create({
        userId,
        addresses: [newAddress],
      });
    } else {
      // If new address is default, remove default from others
      if (newAddress.isDefault) {
        await this.addressModel.updateOne(
          { userId },
          { $set: { 'addresses.$[].isDefault': false } }
        ).exec();
      } else if (!existingDoc.addresses || existingDoc.addresses.length === 0) {
        // If no addresses exist, make this one default
        newAddress.isDefault = true;
      }
      
      // Add the new address
      await this.addressModel.updateOne(
        { userId },
        { $push: { addresses: newAddress } }
      ).exec();
    }

    return newAddress;
  }

  /**
   * Update an existing address
   */
  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<AddressEntry> {
    const doc = await this.addressModel.findOne({ userId }).exec();
    if (!doc || !doc.addresses) {
      throw new NotFoundException('Address not found');
    }

    const addressIndex = (doc.addresses as any[]).findIndex(a => a.addressId === addressId);
    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, remove default from others
    if (dto.isDefault) {
      for (const addr of doc.addresses as any[]) {
        addr.isDefault = false;
      }
    }

    // Update the address
    const existingAddress = doc.addresses[addressIndex] as any;
    if (dto.type !== undefined) existingAddress.type = dto.type;
    if (dto.label !== undefined) existingAddress.label = dto.label;
    if (dto.isDefault !== undefined) existingAddress.isDefault = dto.isDefault;
    if (dto.address) {
      existingAddress.address = { ...existingAddress.address, ...dto.address };
    }
    existingAddress.updatedAt = new Date();

    await doc.save();

    return existingAddress as AddressEntry;
  }

  /**
   * Delete an address
   */
  async deleteAddress(userId: string, addressId: string): Promise<{ success: boolean; message: string }> {
    const doc = await this.addressModel.findOne({ userId }).exec();
    if (!doc || !doc.addresses) {
      throw new NotFoundException('Address not found');
    }

    const addressIndex = (doc.addresses as any[]).findIndex(a => a.addressId === addressId);
    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    const deletedAddress = doc.addresses[addressIndex] as any;
    const wasDefault = deletedAddress.isDefault;

    // Remove the address
    (doc.addresses as any[]).splice(addressIndex, 1);

    // If deleted address was default and there are other addresses, make the first one default
    if (wasDefault && doc.addresses.length > 0) {
      (doc.addresses[0] as any).isDefault = true;
    }

    await doc.save();

    return { success: true, message: 'Address deleted successfully' };
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<AddressEntry> {
    const doc = await this.addressModel.findOne({ userId }).exec();
    if (!doc || !doc.addresses) {
      throw new NotFoundException('Address not found');
    }

    const addressIndex = (doc.addresses as any[]).findIndex(a => a.addressId === addressId);
    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    // Remove default from all addresses
    for (const addr of doc.addresses as any[]) {
      addr.isDefault = false;
    }

    // Set this address as default
    (doc.addresses[addressIndex] as any).isDefault = true;
    (doc.addresses[addressIndex] as any).updatedAt = new Date();

    await doc.save();

    return doc.addresses[addressIndex] as unknown as AddressEntry;
  }

  // Legacy method for backward compatibility
  async saveAddress(userId: string, dto: { shipping: MongoAddressFields; billing?: MongoAddressFields; billingSameAsShipping?: boolean }): Promise<{ userId: string; shipping: MongoAddressFields; billing: MongoAddressFields; isNew: boolean }> {
    const billing = dto.billingSameAsShipping ? { ...dto.shipping } : (dto.billing ?? { ...dto.shipping });
    
    // Check if address already exists
    const existingAddress = await this.addressModel.findOne({ userId }).lean().exec();
    const isNew = !existingAddress;
    
    // For legacy, we store as a single "home" address
    const addressEntry: AddressEntry = {
      addressId: uuidv4(),
      type: AddressType.HOME,
      isDefault: true,
      address: dto.shipping as MongoAddressFields,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isNew) {
      await this.addressModel.create({
        userId,
        addresses: [addressEntry],
      });
    } else {
      // Update existing default address or add new one
      await this.addressModel.updateOne(
        { userId, 'addresses.isDefault': true },
        { $set: { 'addresses.$.address': dto.shipping, 'addresses.$.updatedAt': new Date() } }
      ).exec();
    }

    return {
      userId,
      shipping: dto.shipping,
      billing,
      isNew,
    };
  }

  // Legacy method for backward compatibility
  async getAddress(userId: string): Promise<{ shipping: MongoAddressFields; billing: MongoAddressFields } | null> {
    const defaultAddr = await this.getDefaultAddress(userId);
    if (!defaultAddr) return null;
    return {
      shipping: defaultAddr.address,
      billing: defaultAddr.address, // Use same for both in legacy mode
    };
  }
}
