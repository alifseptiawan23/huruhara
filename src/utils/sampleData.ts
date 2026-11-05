import type { Node, Edge } from '@xyflow/react';
import type { TableData } from '../types/schema';

export const initialTables: Node<TableData>[] = [
  {
    id: 'users',
    type: 'tableNode',
    position: { x: 80, y: 100 },
    data: {
      id: 'users',
      name: 'users',
      color: '#3b82f6', // blue
      columns: [
        { id: 'u_id', name: 'id', type: 'bigint', isPrimaryKey: true, isNullable: false },
        { id: 'u_name', name: 'name', type: 'varchar(255)', isPrimaryKey: false, isNullable: false },
        { id: 'u_email', name: 'email', type: 'varchar(255)', isPrimaryKey: false, isNullable: false, isUnique: true },
        { id: 'u_created_at', name: 'created_at', type: 'timestamp', isPrimaryKey: false, isNullable: false },
      ],
    },
  },
  {
    id: 'orders',
    type: 'tableNode',
    position: { x: 480, y: 100 },
    data: {
      id: 'orders',
      name: 'orders',
      color: '#10b981', // green
      columns: [
        { id: 'o_id', name: 'id', type: 'bigint', isPrimaryKey: true, isNullable: false },
        { id: 'o_user_id', name: 'user_id', type: 'bigint', isPrimaryKey: false, isNullable: false },
        { id: 'o_total', name: 'total_amount', type: 'decimal(10,2)', isPrimaryKey: false, isNullable: false },
        { id: 'o_status', name: 'status', type: 'varchar(50)', isPrimaryKey: false, isNullable: false },
        { id: 'o_created_at', name: 'created_at', type: 'timestamp', isPrimaryKey: false, isNullable: false },
      ],
    },
  },
  {
    id: 'order_items',
    type: 'tableNode',
    position: { x: 880, y: 100 },
    data: {
      id: 'order_items',
      name: 'order_items',
      color: '#f59e0b', // amber
      columns: [
        { id: 'oi_id', name: 'id', type: 'bigint', isPrimaryKey: true, isNullable: false },
        { id: 'oi_order_id', name: 'order_id', type: 'bigint', isPrimaryKey: false, isNullable: false },
        { id: 'oi_product_id', name: 'product_id', type: 'bigint', isPrimaryKey: false, isNullable: false },
        { id: 'oi_qty', name: 'quantity', type: 'integer', isPrimaryKey: false, isNullable: false },
        { id: 'oi_price', name: 'price', type: 'decimal(10,2)', isPrimaryKey: false, isNullable: false },
      ],
    },
  },
  {
    id: 'products',
    type: 'tableNode',
    position: { x: 880, y: 420 },
    data: {
      id: 'products',
      name: 'products',
      color: '#8b5cf6', // purple
      columns: [
        { id: 'p_id', name: 'id', type: 'bigint', isPrimaryKey: true, isNullable: false },
        { id: 'p_name', name: 'name', type: 'varchar(255)', isPrimaryKey: false, isNullable: false },
        { id: 'p_sku', name: 'sku', type: 'varchar(100)', isPrimaryKey: false, isNullable: true, isUnique: true },
        { id: 'p_price', name: 'price', type: 'decimal(10,2)', isPrimaryKey: false, isNullable: false },
      ],
    },
  },
];

export const initialEdges: Edge[] = [
  {
    id: 'e_users_orders',
    source: 'users',
    sourceHandle: 'u_id-source',
    target: 'orders',
    targetHandle: 'o_user_id-target',
    type: 'crowsFoot',
    data: { cardinality: '1:n' },
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e_orders_order_items',
    source: 'orders',
    sourceHandle: 'o_id-source',
    target: 'order_items',
    targetHandle: 'oi_order_id-target',
    type: 'crowsFoot',
    data: { cardinality: '1:n' },
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e_products_order_items',
    source: 'products',
    sourceHandle: 'p_id-source',
    target: 'order_items',
    targetHandle: 'oi_product_id-target',
    type: 'crowsFoot',
    data: { cardinality: '1:n' },
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
];
