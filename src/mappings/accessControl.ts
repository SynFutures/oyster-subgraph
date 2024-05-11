import { Address } from '@graphprotocol/graph-ts';
import { RoleGranted, RoleRevoked } from '../../generated/AccessControlGuardian/AccessControl';
import { AccessControlContractRole } from '../../generated/schema';
import { DEFAULT_ADMIN_ROLE, OPERATOR_ROLE } from '../const';

export function loadOrNewAccessControlContractRole(id: Address): AccessControlContractRole {
  let accr = AccessControlContractRole.load(id.toHexString());
  if (accr == null) {
      accr = new AccessControlContractRole(id.toHexString());
      accr.admins = [];
      accr.operators = [];
      accr.save();
  }
  return accr as AccessControlContractRole;
}

export function handleRoleGranted(event: RoleGranted): void {
  let accr = loadOrNewAccessControlContractRole(event.address);
  if (event.params.role.toHexString() == DEFAULT_ADMIN_ROLE) {
      let admins = accr.admins;
      admins.push(event.params.account);
      accr.admins = admins;
      accr.save();
      return;
  }

  if (event.params.role.toHexString() == OPERATOR_ROLE) {
    let operators = accr.operators;
    operators.push(event.params.account);
    accr.operators = operators;
    accr.save();
    return;
  }
}

export function handleRoleRevoked(event: RoleRevoked): void {
  let accr = loadOrNewAccessControlContractRole(event.address);

  if (event.params.role.toHexString() == DEFAULT_ADMIN_ROLE) {
    let admins = accr.admins;
    let index = admins.indexOf(event.params.account);
    if (index > -1) {
      admins.splice(index, 1);
    }
    accr.admins = admins;
    accr.save();
    return;
  }

  if (event.params.role.toHexString() == OPERATOR_ROLE) {
    let operators = accr.operators;
    let index = operators.indexOf(event.params.account);
    if (index > -1) {
      operators.splice(index, 1);
    }
    accr.operators = operators;
    accr.save();
    return;
  }
}
